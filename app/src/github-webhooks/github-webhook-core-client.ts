import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CorrelatedRequest } from '../correlation-id.middleware.js';
import { coreWebhookUnavailable } from '../github/errors.js';
import type { GitHubWebhookAcceptedResponse, NormalizedWebhookEvent } from './github-webhook.types.js';

export const GITHUB_WEBHOOK_FETCH = Symbol('GITHUB_WEBHOOK_FETCH');
const CORE_WEBHOOK_TIMEOUT_MS = 8_000;
const CORE_WEBHOOK_PATH = '/internal/v1/github/webhook-events';

@Injectable()
export class GithubWebhookCoreClient {
  constructor(
    private readonly config: ConfigService,
    @Inject(GITHUB_WEBHOOK_FETCH) private readonly fetcher: typeof fetch,
  ) {}

  async deliver(
    event: NormalizedWebhookEvent,
    request: Pick<CorrelatedRequest, 'correlationId'>,
  ): Promise<{ status: 200 | 202; body: GitHubWebhookAcceptedResponse }> {
    const baseUrl = this.config.get<string>('CORE_API_BASE_URL');
    const token = this.config.get<string>('GITHUB_INTEGRATION_TO_CORE_TOKEN');
    if (!baseUrl || !token) throw coreWebhookUnavailable();

    try {
      const endpoint = new URL(CORE_WEBHOOK_PATH, baseUrl).toString();
      const response = await this.fetcher(endpoint, {
        method: 'POST',
        redirect: 'error',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Correlation-ID': request.correlationId ?? event.deliveryId,
        },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(CORE_WEBHOOK_TIMEOUT_MS),
      });
      if (response.status !== 200 && response.status !== 202) throw coreWebhookUnavailable();
      const body: unknown = await response.json();
      if (!isAcceptedResponse(body, event, response.status)) throw coreWebhookUnavailable();

      return {
        status: response.status,
        body: {
          deliveryId: event.deliveryId,
          accepted: true,
          duplicate: response.status === 200,
          analysisRunId: (body as GitHubWebhookAcceptedResponse).analysisRunId,
        },
      };
    } catch {
      throw coreWebhookUnavailable();
    }
  }
}

function isAcceptedResponse(
  value: unknown,
  event: NormalizedWebhookEvent,
  status: number,
): value is GitHubWebhookAcceptedResponse {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const body = value as Record<string, unknown>;
  const statusMatches = status === 200
    ? event.data.kind === 'PULL_REQUEST' && body.duplicate === true
    : body.duplicate === false;
  return body.deliveryId === event.deliveryId && body.accepted === true && statusMatches &&
    (body.analysisRunId === null || typeof body.analysisRunId === 'string');
}
