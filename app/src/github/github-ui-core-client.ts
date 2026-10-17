import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { coreAuthorizationUnavailable, GithubIntegrationError, type PublicGithubErrorCode } from './errors.js';

export const GITHUB_UI_CORE_FETCH = Symbol('GITHUB_UI_CORE_FETCH');
const AUTHORIZATION_PATH = '/internal/v1/github/authorization-decisions';
const AUTHORIZATION_TIMEOUT_MS = 5_000;

export type GithubUiAction =
  | 'VIEW_APP_INFO'
  | 'DISCOVER_REPOSITORIES'
  | 'VERIFY_REPOSITORY_ACCESS'
  | 'LIST_REPOSITORY_BRANCHES';

export interface GithubRepositoryFact {
  repositoryId: string;
  repositoryName: string;
  ownerId: string;
  ownerType: 'User' | 'Organization';
  permission: 'admin' | 'maintain' | 'write' | 'triage' | 'read' | 'none';
  installationId?: string;
  installationActive: boolean;
  organizationMembership?: { state: 'active' | 'pending'; role: 'admin' | 'member' };
}

export interface GithubUiAuthorizationRequest {
  action: GithubUiAction;
  projectId?: string;
  githubUserId?: string;
  repositories?: GithubRepositoryFact[];
  repositoryId?: string;
  repositoryName?: string;
  integrationBranch?: string;
}

export interface GithubUiAuthorizationDecision {
  decision: 'ALLOW' | 'DENY';
  repositoryOwnerId?: string;
  repositoryOwnerType?: 'User' | 'Organization';
  githubUserId?: string;
  authorizationEvidence?: string | null;
}

@Injectable()
export class GithubUiCoreClient {
  private readonly logger = new Logger(GithubUiCoreClient.name);

  constructor(
    private readonly config: ConfigService,
    @Inject(GITHUB_UI_CORE_FETCH) private readonly fetcher: typeof fetch,
  ) {}

  async decide(
    sessionToken: string,
    body: GithubUiAuthorizationRequest,
    correlationId: string,
  ): Promise<GithubUiAuthorizationDecision> {
    const startedAt = performance.now();
    const baseUrl = this.config.get<string>('CORE_API_BASE_URL');
    const serviceToken = this.config.get<string>('GITHUB_INTEGRATION_TO_CORE_TOKEN');
    if (!baseUrl || !serviceToken || !sessionToken) {
      this.logFailure(correlationId, body.action, 'configuration_missing', startedAt);
      throw coreAuthorizationUnavailable();
    }

    try {
      const response = await this.fetcher(new URL(AUTHORIZATION_PATH, baseUrl), {
        method: 'POST',
        redirect: 'error',
        headers: {
          Authorization: `Bearer ${serviceToken}`,
          'X-Platform-User-Token': `Bearer ${sessionToken}`,
          'X-Correlation-ID': correlationId,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(AUTHORIZATION_TIMEOUT_MS),
      });

      if (response.status !== 200) {
        const errorBody = await response.json().catch(() => null) as { code?: unknown } | null;
        const coreCode = knownCoreErrorCode(response.status, errorBody?.code);
        this.logFailure(correlationId, body.action, 'http_response', startedAt, {
          httpStatus: response.status,
          coreCode: coreCode ?? 'UNRECOGNIZED',
        });
        throw mapCoreError(response.status, errorBody?.code);
      }

      let value: unknown;
      try {
        value = await response.json();
      } catch {
        this.logFailure(correlationId, body.action, 'malformed_response', startedAt, { httpStatus: response.status });
        throw coreAuthorizationUnavailable();
      }
      if (!isDecision(value)) {
        this.logFailure(correlationId, body.action, 'malformed_response', startedAt, { httpStatus: response.status });
        throw coreAuthorizationUnavailable();
      }
      return value;
    } catch (error) {
      if (error instanceof GithubIntegrationError) throw error;
      const reason = error instanceof Error && error.name === 'TimeoutError'
        ? 'timeout'
        : error instanceof Error && error.name === 'TypeError' ? 'network_error' : 'unexpected_failure';
      this.logFailure(correlationId, body.action, reason, startedAt);
      throw coreAuthorizationUnavailable();
    }
  }

  private logFailure(
    correlationId: string,
    action: GithubUiAction,
    reason: string,
    startedAt: number,
    details: { httpStatus?: number; coreCode?: string } = {},
  ): void {
    this.logger.warn(JSON.stringify({
      event: 'github_ui_core_authorization_failed',
      correlationId,
      action,
      reason,
      durationMs: Math.round(performance.now() - startedAt),
      ...details,
    }));
  }
}

function knownCoreErrorCode(status: number, rawCode: unknown): string | null {
  if (typeof rawCode !== 'string') return null;
  const allowed = new Map<string, number>([
    ['AUTH_REQUIRED', 401],
    ['INVALID_ACCESS_TOKEN', 401],
    ['GITHUB_IDENTITY_REQUIRED', 401],
    ['IDENTITY_UNAVAILABLE', 503],
    ['PROJECT_NOT_FOUND', 404],
    ['PROJECT_ROLE_INSUFFICIENT', 403],
  ]);
  return allowed.get(rawCode) === status ? rawCode : null;
}

function mapCoreError(status: number, rawCode: unknown): GithubIntegrationError {
  const allowed = new Map<string, { status: 401 | 403 | 404 | 503; retryable: boolean }>([
    ['AUTH_REQUIRED', { status: 401, retryable: false }],
    ['INVALID_ACCESS_TOKEN', { status: 401, retryable: false }],
    ['GITHUB_IDENTITY_REQUIRED', { status: 401, retryable: false }],
    ['IDENTITY_UNAVAILABLE', { status: 503, retryable: true }],
    ['PROJECT_NOT_FOUND', { status: 404, retryable: false }],
    ['PROJECT_ROLE_INSUFFICIENT', { status: 403, retryable: false }],
  ]);
  const code = typeof rawCode === 'string' ? rawCode : '';
  const mapped = allowed.get(code);
  if (!mapped || mapped.status !== status) return coreAuthorizationUnavailable();
  return new GithubIntegrationError(
    code as PublicGithubErrorCode,
    code === 'PROJECT_NOT_FOUND' ? 'The requested Project is unavailable.' : 'Core could not authorize this GitHub operation.',
    mapped.status,
    mapped.retryable,
  );
}

function isDecision(value: unknown): value is GithubUiAuthorizationDecision {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  const allowedKeys = new Set([
    'decision',
    'repositoryOwnerId',
    'repositoryOwnerType',
    'githubUserId',
    'authorizationEvidence',
  ]);
  return (body.decision === 'ALLOW' || body.decision === 'DENY') &&
    Object.keys(body).every((key) => allowedKeys.has(key)) &&
    (body.repositoryOwnerId === undefined || typeof body.repositoryOwnerId === 'string') &&
    (body.repositoryOwnerType === undefined || body.repositoryOwnerType === 'User' || body.repositoryOwnerType === 'Organization') &&
    (body.githubUserId === undefined || typeof body.githubUserId === 'string') &&
    (body.authorizationEvidence === undefined || body.authorizationEvidence === null || typeof body.authorizationEvidence === 'string');
}
