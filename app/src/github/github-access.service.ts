import { Injectable } from '@nestjs/common';
import { GithubApiClient, readJson } from './github-api.client.js';
import {
  GithubApiError,
  GithubIntegrationError,
  invalidRequest,
  upstreamUnavailable,
} from './errors.js';
import { GithubAppAuthService, repositoryPath } from './github-app-auth.service.js';

export type GithubLookup<T> =
  | { status: 'OK'; value: T }
  | { status: 'NOT_FOUND' }
  | { status: 'NOT_INSTALLED' }
  | { status: 'UNVERIFIABLE' };

export type RepositoryPermissionLevel = 'admin' | 'maintain' | 'write' | 'triage' | 'read';

const BRANCH_LIST_MAX_PAGES = 10;
const BRANCH_LIST_TIMEOUT_MS = 30_000;

interface ApiRepository {
  id?: unknown;
  full_name?: unknown;
  name?: unknown;
  default_branch?: unknown;
  private?: unknown;
  permissions?: { admin?: unknown; maintain?: unknown; push?: unknown; pull?: unknown };
  owner?: { id?: unknown; login?: unknown; type?: unknown; avatar_url?: unknown };
}

interface ApiMembership {
  role?: unknown;
  state?: unknown;
}

@Injectable()
export class GithubAccessService {
  constructor(
    private readonly api: GithubApiClient,
    private readonly appAuth: GithubAppAuthService,
  ) {}

  async getRepositoryOwner(installationId: string, repositoryName: string): Promise<GithubLookup<{
    repositoryId: string; ownerId: string; ownerLogin: string; ownerType: 'User' | 'Organization';
  }>> {
    const token = await this.getInstallationToken(installationId);
    if (token.status !== 'OK') return token;
    const result = await this.getLookup<ApiRepository>(`/repos/${repositoryPath(repositoryName)}`, token.value);
    if (result.status !== 'OK') return result;
    const body = result.value;
    const owner = body.owner;
    const ownerType = toOwnerType(owner?.type);
    if (!Number.isSafeInteger(body.id) || !owner || !Number.isSafeInteger(owner.id) || typeof owner.login !== 'string' || !ownerType) return { status: 'UNVERIFIABLE' };
    return { status: 'OK', value: { repositoryId: String(body.id), ownerId: String(owner.id), ownerLogin: owner.login, ownerType } };
  }

  async getRepositoryById(installationId: string, repositoryId: string): Promise<GithubLookup<{
    repositoryId: string; repositoryName: string; ownerId: string; ownerLogin: string; ownerType: 'User' | 'Organization';
  }>> {
    const token = await this.getInstallationToken(installationId);
    if (token.status !== 'OK') return token;
    const result = await this.getLookup<ApiRepository>(`/repositories/${encodeURIComponent(repositoryId)}`, token.value);
    if (result.status !== 'OK') return result;
    const body = result.value;
    const owner = body.owner;
    const ownerType = toOwnerType(owner?.type);
    if (!Number.isSafeInteger(body.id) || typeof body.full_name !== 'string' || !owner || !Number.isSafeInteger(owner.id) || typeof owner.login !== 'string' || !ownerType) return { status: 'UNVERIFIABLE' };
    return {
      status: 'OK',
      value: { repositoryId: String(body.id), repositoryName: body.full_name, ownerId: String(owner.id), ownerLogin: owner.login, ownerType },
    };
  }

  async getRepositoryPermission(
    installationId: string,
    repositoryName: string,
    githubUserId: string,
  ): Promise<GithubLookup<RepositoryPermissionLevel>> {
    const token = await this.getInstallationToken(installationId);
    if (token.status !== 'OK') return token;
    const user = await this.getLookup<{ login?: unknown }>(`/user/${encodeURIComponent(githubUserId)}`, token.value);
    if (user.status !== 'OK') return user;
    if (typeof user.value.login !== 'string' || !user.value.login) return { status: 'UNVERIFIABLE' };
    const permission = await this.getLookup<{ role_name?: unknown; permission?: unknown }>(
      `/repos/${repositoryPath(repositoryName)}/collaborators/${encodeURIComponent(user.value.login)}/permission`,
      token.value,
    );
    if (permission.status !== 'OK') return permission;
    if (permission.value.role_name === 'none' || permission.value.permission === 'none') return { status: 'NOT_FOUND' };
    const level = toPermissionLevel(permission.value);
    return level ? { status: 'OK', value: level } : { status: 'UNVERIFIABLE' };
  }

  async listOrganizationInstallations(): Promise<GithubLookup<Array<{
    installationId: string; organizationId: string; organizationLogin: string; avatarUrl: string | null; suspended: boolean;
  }>>> {
    const result = await this.appAuth.listOrganizationInstallations();
    return result.status === 'OK' ? result : { status: 'UNVERIFIABLE' };
  }

  async getOrganizationMembership(
    installationId: string,
    organizationLogin: string,
    githubUserId: string,
  ): Promise<GithubLookup<{ role: 'admin' | 'member'; state: 'active' | 'pending' }>> {
    const token = await this.getInstallationToken(installationId);
    if (token.status !== 'OK') return token;
    const user = await this.getLookup<{ login?: unknown }>(`/user/${encodeURIComponent(githubUserId)}`, token.value);
    if (user.status !== 'OK') return user;
    if (typeof user.value.login !== 'string' || !user.value.login) return { status: 'UNVERIFIABLE' };
    const membership = await this.getLookup<ApiMembership>(
      `/orgs/${encodeURIComponent(organizationLogin)}/memberships/${encodeURIComponent(user.value.login)}`,
      token.value,
    );
    if (membership.status !== 'OK') return membership;
    const role = membership.value.role;
    const state = membership.value.state;
    if ((role !== 'admin' && role !== 'member') || (state !== 'active' && state !== 'pending')) return { status: 'UNVERIFIABLE' };
    return { status: 'OK', value: { role, state } };
  }

  async listOrganizationOwners(
    installationId: string,
    organizationLogin: string,
  ): Promise<GithubLookup<Array<{ githubUserId: string; login: string }>>> {
    const token = await this.getInstallationToken(installationId);
    if (token.status !== 'OK') return token;
    const listed = await this.getAllPages<{ id?: unknown; login?: unknown }>(
      `/orgs/${encodeURIComponent(organizationLogin)}/members?role=admin`, token.value, 10,
    );
    if (listed.status !== 'OK') return listed;
    if (listed.value.length === 0) return { status: 'UNVERIFIABLE' };
    if (listed.value.some((owner) => !Number.isSafeInteger(owner.id) || typeof owner.login !== 'string')) return { status: 'UNVERIFIABLE' };
    return { status: 'OK', value: listed.value.map((owner) => ({ githubUserId: String(owner.id), login: owner.login as string })) };
  }

  async listBranches(
    installationId: string,
    repositoryName: string,
  ): Promise<GithubLookup<{ items: Array<{ name: string; protected: boolean }> }>> {
    const deadline = Date.now() + BRANCH_LIST_TIMEOUT_MS;
    const token = await this.getInstallationToken(installationId, BRANCH_LIST_TIMEOUT_MS);
    if (token.status !== 'OK') return token;
    const items: Array<{ name: string; protected: boolean }> = [];
    for (let page = 1; page <= BRANCH_LIST_MAX_PAGES; page += 1) {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) return { status: 'UNVERIFIABLE' };
      const result = await this.getLookup<Array<{ name?: unknown; protected?: unknown }>>(
        `/repos/${repositoryPath(repositoryName)}/branches?per_page=100&page=${page}`,
        token.value,
        remainingMs,
      );
      if (result.status !== 'OK') return result;
      if (!Array.isArray(result.value) || result.value.some((branch) => typeof branch.name !== 'string' || typeof branch.protected !== 'boolean')) return { status: 'UNVERIFIABLE' };
      items.push(...result.value.map((branch) => ({ name: branch.name as string, protected: branch.protected as boolean })));
      if (result.value.length < 100) return { status: 'OK', value: { items } };
    }
    return { status: 'UNVERIFIABLE' };
  }

  async resolveInstallation(repositoryName: string): Promise<string | null> {
    return this.appAuth.findInstallationForRepository(repositoryName);
  }

  async getAppInfo(): Promise<{ displayName: string; slug: string; configureUrl: string }> {
    const app = await this.appAuth.getAppInfo();
    return {
      displayName: app.name,
      slug: app.slug,
      configureUrl: `https://github.com/apps/${encodeURIComponent(app.slug)}/installations/new`,
    };
  }

  private async getInstallationToken(installationId: string, timeoutMs?: number): Promise<
    | { status: 'OK'; value: string }
    | { status: 'NOT_INSTALLED' }
    | { status: 'UNVERIFIABLE' }
  > {
    try {
      return { status: 'OK', value: await this.appAuth.getInstallationToken(installationId, timeoutMs) };
    } catch (error) {
      if (error instanceof GithubApiError && error.status === 404) return { status: 'NOT_INSTALLED' };
      return { status: 'UNVERIFIABLE' };
    }
  }

  private async getLookup<T>(path: string, token: string, timeoutMs?: number): Promise<GithubLookup<T>> {
    try {
      const response = timeoutMs === undefined
        ? await this.api.request(path, token)
        : await this.api.request(path, token, { timeoutMs });
      if (response.status === 404) return { status: 'NOT_FOUND' };
      if (!response.ok) return { status: 'UNVERIFIABLE' };
      const body = await readJson<T>(response);
      return body === null ? { status: 'UNVERIFIABLE' } : { status: 'OK', value: body };
    } catch {
      return { status: 'UNVERIFIABLE' };
    }
  }

  private async getAllPages<T>(path: string, token: string, maxPages: number): Promise<GithubLookup<T[]>> {
    const items: T[] = [];
    for (let page = 1; page <= maxPages; page += 1) {
      let response: Response;
      try {
        response = await this.api.request(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${page}`, token);
      } catch {
        return { status: 'UNVERIFIABLE' };
      }
      if (response.status === 404) return { status: 'NOT_FOUND' };
      if (!response.ok) return { status: 'UNVERIFIABLE' };
      const body = await readJson<unknown>(response);
      if (!Array.isArray(body)) return { status: 'UNVERIFIABLE' };
      items.push(...body as T[]);
      if (body.length < 100) return { status: 'OK', value: items };
    }
    return { status: 'UNVERIFIABLE' };
  }
}

@Injectable()
export class GithubRepositoryDiscoveryService {
  constructor(private readonly api: GithubApiClient) {}

  async getAuthenticatedUser(providerToken: string): Promise<{ githubUserId: string }> {
    let response: Response;
    try {
      response = await this.api.request('/user', providerToken);
    } catch {
      throw upstreamUnavailable();
    }
    if (response.status === 401) {
      throw new GithubIntegrationError('GITHUB_USER_TOKEN_INVALID', 'GitHub provider token is invalid or expired.', 401, false);
    }
    if (!response.ok) throw upstreamUnavailable();
    const body = await readJson<{ id?: unknown }>(response);
    if (!body || !Number.isSafeInteger(body.id) || Number(body.id) < 1) throw upstreamUnavailable();
    return { githubUserId: String(body.id) };
  }

  async getRepositoryFacts(providerToken: string, repositoryName: string): Promise<{
    repositoryId: string;
    repositoryName: string;
    ownerId: string;
    ownerLogin: string;
    ownerType: 'User' | 'Organization';
    permission: RepositoryPermissionLevel | 'none';
  }> {
    let response: Response;
    try {
      response = await this.api.request(`/repos/${repositoryPath(repositoryName)}`, providerToken);
    } catch {
      throw upstreamUnavailable();
    }
    if (response.status === 401) {
      throw new GithubIntegrationError('GITHUB_USER_TOKEN_INVALID', 'GitHub provider token is invalid or expired.', 401, false);
    }
    if (response.status === 404) {
      throw new GithubIntegrationError('GITHUB_RESOURCE_NOT_FOUND', 'The GitHub repository is unavailable.', 404, false);
    }
    if (!response.ok) throw upstreamUnavailable();
    const body = await readJson<ApiRepository>(response);
    const ownerType = toOwnerType(body?.owner?.type);
    if (!body || !Number.isSafeInteger(body.id) || body.full_name !== repositoryName ||
      !Number.isSafeInteger(body.owner?.id) || typeof body.owner?.login !== 'string' || !ownerType) {
      throw upstreamUnavailable();
    }
    return {
      repositoryId: String(body.id),
      repositoryName: body.full_name,
      ownerId: String(body.owner.id),
      ownerLogin: body.owner.login,
      ownerType,
      permission: toPermissionLevel(body.permissions ?? {}) ?? 'none',
    };
  }

  async list(
    providerToken: string,
    page: number,
    perPage: number,
    filters: { personalOwnerId?: string; organizationOwnerId?: string },
  ): Promise<{ items: Array<{
    repositoryId: string; name: string; repositoryName: string;
    owner: { id: string; login: string; type: 'Organization' | 'User'; avatarUrl: string | null };
    private: boolean; defaultBranch: string;
    permissions: { admin: boolean; maintain: boolean; push: boolean; pull: boolean };
    permission: RepositoryPermissionLevel | 'none';
  }>; hasNextPage: boolean }> {
    if (filters.personalOwnerId && filters.organizationOwnerId) throw invalidRequest();
    const affiliation = filters.personalOwnerId ? '&affiliation=owner' : filters.organizationOwnerId ? '&affiliation=organization_member' : '';
    let response: Response;
    try {
      response = await this.api.request(`/user/repos?per_page=${perPage}&page=${page}&sort=updated${affiliation}`, providerToken);
    } catch {
      throw upstreamUnavailable();
    }
    if (response.status === 401) {
      throw new GithubIntegrationError('GITHUB_USER_TOKEN_INVALID', 'GitHub provider token is invalid or expired.', 401, false);
    }
    // GitHub uses 403 as well as 429 for rate limits. An ambiguous 403 must not masquerade as an expired session.
    if (!response.ok) throw upstreamUnavailable();
    const repos = await readJson<ApiRepository[]>(response);
    if (!Array.isArray(repos)) throw upstreamUnavailable();
    const ownerId = filters.personalOwnerId ?? filters.organizationOwnerId;
    const visible = ownerId ? repos.filter((repo) => String(repo.owner?.id) === ownerId) : repos;
    const items = visible.map((repo) => {
      const owner = repo.owner;
      if (!Number.isSafeInteger(repo.id) || typeof repo.name !== 'string' || typeof repo.full_name !== 'string' ||
        !owner || !Number.isSafeInteger(owner.id) || typeof owner.login !== 'string' || !toOwnerType(owner.type) || typeof repo.private !== 'boolean' ||
        typeof repo.default_branch !== 'string') throw upstreamUnavailable();
      return {
        repositoryId: String(repo.id), name: repo.name, repositoryName: repo.full_name,
        owner: {
          id: String(owner.id),
          login: owner.login,
          type: owner.type === 'Organization' ? 'Organization' as const : 'User' as const,
          avatarUrl: typeof owner.avatar_url === 'string' ? owner.avatar_url : null,
        },
        private: repo.private, defaultBranch: repo.default_branch,
        permissions: {
          admin: repo.permissions?.admin === true,
          maintain: repo.permissions?.maintain === true,
          push: repo.permissions?.push === true,
          pull: repo.permissions?.pull === true,
        },
        permission: (toPermissionLevel(repo.permissions ?? {}) ?? 'none') as RepositoryPermissionLevel | 'none',
      };
    });
    return { items, hasNextPage: repos.length === perPage };
  }
}

function toOwnerType(value: unknown): 'User' | 'Organization' | null {
  if (value === 'User' || value === 'Organization') return value;
  return null;
}

function toPermissionLevel(body: {
  role_name?: unknown;
  permission?: unknown;
  admin?: unknown;
  maintain?: unknown;
  push?: unknown;
  pull?: unknown;
}): RepositoryPermissionLevel | null {
  const known = ['admin', 'maintain', 'write', 'triage', 'read'];
  if (typeof body.role_name === 'string' && known.includes(body.role_name)) return body.role_name as RepositoryPermissionLevel;
  if (body.permission === 'admin' || body.permission === 'write' || body.permission === 'read') return body.permission;
  if (body.admin === true) return 'admin';
  if (body.maintain === true) return 'maintain';
  if (body.push === true) return 'write';
  if (body.pull === true) return 'read';
  return null;
}
