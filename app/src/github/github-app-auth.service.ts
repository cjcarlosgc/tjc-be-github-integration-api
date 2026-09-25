import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPrivateKey } from 'node:crypto';
import { importPKCS8, SignJWT } from 'jose';
import { GithubApiClient, readJson } from './github-api.client.js';
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

@Injectable()
export class GithubAppAuthService {
  private readonly installationTokens = new Map<string, CachedInstallationToken>();
  private appInfoCache: { name: string; slug: string } | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly api: GithubApiClient,
  ) {}

  async signAppJwt(): Promise<string> {
    const appId = this.config.get<string>('GITHUB_APP_ID');
    const keyBase64 = this.config.get<string>('GITHUB_APP_PRIVATE_KEY_BASE64');
    if (!appId || !keyBase64) throw appConfigurationUnavailable();

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
    } catch {
      return { status: 'UNVERIFIABLE' };
    }

    const result: Array<{ installationId: string; organizationId: string; organizationLogin: string; avatarUrl: string | null; suspended: boolean }> = [];
    for (let page = 1; page <= MAX_PAGES; page += 1) {
      let response: Response;
      try {
        response = await this.api.request(`/app/installations?per_page=${PAGE_SIZE}&page=${page}`, jwt);
      } catch {
        return { status: 'UNVERIFIABLE' };
      }
      if (!response.ok) return { status: 'UNVERIFIABLE' };
      const data = await readJson<unknown>(response);
      if (!Array.isArray(data)) return { status: 'UNVERIFIABLE' };
      for (const entry of data as Array<{ id?: unknown; account?: { id?: unknown; login?: unknown; type?: unknown; avatar_url?: unknown } | null; suspended_at?: unknown }>) {
        if (!entry.account || (entry.account.type !== 'Organization' && entry.account.type !== 'User')) return { status: 'UNVERIFIABLE' };
        if (entry.account.type === 'User') continue;
        if (!Number.isSafeInteger(entry.id) || !Number.isSafeInteger(entry.account.id) || typeof entry.account.login !== 'string') return { status: 'UNVERIFIABLE' };
        result.push({
          installationId: String(entry.id),
          organizationId: String(entry.account.id),
          organizationLogin: entry.account.login,
          avatarUrl: typeof entry.account.avatar_url === 'string' ? entry.account.avatar_url : null,
          suspended: Boolean(entry.suspended_at),
        });
      }
      if (data.length < PAGE_SIZE) return { status: 'OK', value: result };
    }
    return { status: 'UNVERIFIABLE' };
  }
}

export function repositoryPath(repositoryName: string): string {
  const [owner, repo] = repositoryName.split('/');
  return `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
}
