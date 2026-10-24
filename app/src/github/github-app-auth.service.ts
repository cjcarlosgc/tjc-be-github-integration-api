import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrivateKey } from 'node:crypto';
import { importPKCS8, SignJWT } from 'jose';
import { GithubApiClient, readJson } from './github-api.client.js';
import { errorName } from '../process-safety.js';
import {
  GithubApiError,
  appConfigurationUnavailable,
  upstreamUnavailable,
} from './errors.js';

const APP_JWT_LIFETIME_SECONDS = 9 * 60;
const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000;
const PAGE_SIZE = 100;
const MAX_PAGES = 10;

interface CachedInstallationToken {
  token: string;
  expiresAt: number;
}

interface AppResponse {
  name?: string;
  slug?: string;
}

interface InstallationTokenResponse {
  token?: string;
  expires_at?: string;
}

interface InstallationResponse {
  id?: number;
}

/** Motivos cerrados por los que listOrganizationInstallations() devuelve UNVERIFIABLE (solo para logs). */
type UnverifiableReason =
  | 'JWT_NO_FIRMABLE'
  | 'GITHUB_SIN_RESPUESTA'
  | `GITHUB_HTTP_${number}`
  | 'GITHUB_HTTP_DESCONOCIDO'
  | 'RESPUESTA_NO_ES_LISTA'
  | `INSTALACION_INVALIDA:${'AUSENTE' | 'Organization' | 'OTRO'}`
  | 'DEMASIADAS_PAGINAS';

@Injectable()
export class GithubAppAuthService {
  private readonly logger = new Logger(GithubAppAuthService.name);
  private readonly installationTokens = new Map<string, CachedInstallationToken>();
  private appInfoCache: { name: string; slug: string } | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly api: GithubApiClient,
  ) {}

  getConfiguredAppId(): string {
    const appId = this.config.get<string>('GITHUB_APP_ID');
    if (!appId) throw appConfigurationUnavailable();
    return appId;
  }

  async signAppJwt(): Promise<string> {
    const appId = this.getConfiguredAppId();
    const keyBase64 = this.config.get<string>('GITHUB_APP_PRIVATE_KEY_BASE64');
    if (!keyBase64) throw appConfigurationUnavailable();

    try {
      const pem = Buffer.from(keyBase64, 'base64').toString('utf8');
      const privateKey = createPrivateKey(pem);
      const pkcs8 = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
      const key = await importPKCS8(pkcs8, 'RS256');
      const nowSeconds = Math.floor(Date.now() / 1000);
      return await new SignJWT({})
        .setProtectedHeader({ alg: 'RS256' })
        .setIssuedAt(nowSeconds - 30)
        .setIssuer(appId)
        .setExpirationTime(nowSeconds + APP_JWT_LIFETIME_SECONDS)
        .sign(key);
    } catch {
      throw appConfigurationUnavailable();
    }
  }

  async getAppInfo(): Promise<{ name: string; slug: string }> {
    if (this.appInfoCache) return this.appInfoCache;
    const jwt = await this.signAppJwt();
    const response = await this.api.request('/app', jwt);
    if (response.status === 401) throw appConfigurationUnavailable();
    if (!response.ok) throw upstreamUnavailable();
    const data = await readJson<AppResponse>(response);
    if (!data?.name || !data.slug) throw upstreamUnavailable();
    this.appInfoCache = { name: data.name, slug: data.slug };
    return this.appInfoCache;
  }

  async findInstallationForRepository(repositoryName: string): Promise<string | null> {
    const jwt = await this.signAppJwt();
    const response = await this.api.request(`/repos/${repositoryPath(repositoryName)}/installation`, jwt);
    if (response.status === 404) return null;
    if (response.status === 401) throw appConfigurationUnavailable();
    if (!response.ok) throw upstreamUnavailable();
    const data = await readJson<InstallationResponse>(response);
    if (!data || !Number.isSafeInteger(data.id)) throw upstreamUnavailable();
    return String(data.id);
  }

  async getInstallationToken(installationId: string, timeoutMs?: number): Promise<string> {
    const cached = this.installationTokens.get(installationId);
    if (cached && cached.expiresAt - TOKEN_REFRESH_MARGIN_MS > Date.now()) return cached.token;

    const jwt = await this.signAppJwt();
    const response = await this.api.request(`/app/installations/${encodeURIComponent(installationId)}/access_tokens`, jwt, {
      method: 'POST',
      body: {},
      ...(timeoutMs === undefined ? {} : { timeoutMs }),
    });
    if (response.status === 404) throw new GithubApiError(404);
    if (response.status === 401) throw appConfigurationUnavailable();
    if (!response.ok) throw upstreamUnavailable();

    const data = await readJson<InstallationTokenResponse>(response);
    const expiresAt = data?.expires_at ? Date.parse(data.expires_at) : Number.NaN;
    if (!data?.token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw upstreamUnavailable();
    this.installationTokens.set(installationId, { token: data.token, expiresAt });
    return data.token;
  }

  async listOrganizationInstallations(): Promise<
    | { status: 'OK'; value: Array<{ installationId: string; organizationId: string; organizationLogin: string; avatarUrl: string | null; suspended: boolean }> }
    | { status: 'UNVERIFIABLE' }
  > {
    let jwt: string;
    try {
      jwt = await this.signAppJwt();
    } catch (error) {
      return this.warnUnverifiable('JWT_NO_FIRMABLE', { errorName: errorName(error) });
    }

    const result: Array<{ installationId: string; organizationId: string; organizationLogin: string; avatarUrl: string | null; suspended: boolean }> = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      let response: Response;
      const startedAt = Date.now();
      try {
        response = await this.api.request(`/app/installations?per_page=${PAGE_SIZE}&page=${page}`, jwt);
      } catch (error) {
        return this.warnUnverifiable('GITHUB_SIN_RESPUESTA', { durationMs: Date.now() - startedAt, errorName: errorName(error) });
      }
      if (!response.ok) {
        const status = response.status;
        const reason: UnverifiableReason = Number.isInteger(status) && status >= 100 && status <= 599
          ? `GITHUB_HTTP_${status}`
          : 'GITHUB_HTTP_DESCONOCIDO';
        return this.warnUnverifiable(reason);
      }
      const data = await readJson<unknown>(response);
      if (!Array.isArray(data)) return this.warnUnverifiable('RESPUESTA_NO_ES_LISTA');
      for (const entry of data as Array<{ id?: unknown; account?: { id?: unknown; login?: unknown; type?: unknown; avatar_url?: unknown } | null; suspended_at?: unknown }>) {
        const account = entry.account;
        if (!account) return this.warnUnverifiable('INSTALACION_INVALIDA:AUSENTE');
        if (account.type !== 'Organization' && account.type !== 'User') return this.warnUnverifiable('INSTALACION_INVALIDA:OTRO');
        if (account.type === 'User') continue;
        if (!Number.isSafeInteger(entry.id) || !Number.isSafeInteger(account.id) || typeof account.login !== 'string') {
          return this.warnUnverifiable('INSTALACION_INVALIDA:Organization');
        }
        result.push({
          installationId: String(entry.id),
          organizationId: String(account.id),
          organizationLogin: account.login,
          avatarUrl: typeof account.avatar_url === 'string' ? account.avatar_url : null,
          suspended: Boolean(entry.suspended_at),
        });
      }
      if (data.length < PAGE_SIZE) return { status: 'OK', value: result };
    }
    return this.warnUnverifiable('DEMASIADAS_PAGINAS');
  }

  /**
   * Registra el motivo (y, si se pasa, la duración o el nombre sanitizado del error) y devuelve el resultado
   * UNVERIFIABLE sin cambios. Nunca recibe ni registra cuerpos, JWT, clave, ids, logins ni texto de error.
   */
  private warnUnverifiable(
    reason: UnverifiableReason,
    extra: { durationMs?: number; errorName?: string } = {},
  ): { status: 'UNVERIFIABLE' } {
    let message = `listOrganizationInstallations UNVERIFIABLE motivo=${reason}`;
    if (extra.durationMs !== undefined) message += ` duracionMs=${extra.durationMs}`;
    if (extra.errorName !== undefined) message += ` error=${extra.errorName}`;
    this.logger.warn(message);
    return { status: 'UNVERIFIABLE' };
  }
}

export function repositoryPath(repositoryName: string): string {
  const [owner, repo] = repositoryName.split('/');
  return `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}
