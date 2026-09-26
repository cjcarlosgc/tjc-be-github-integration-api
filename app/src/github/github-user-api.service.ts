import { Injectable } from '@nestjs/common';
import {
  GithubAccessService,
  GithubRepositoryDiscoveryService,
  type GithubLookup,
} from './github-access.service.js';
import {
  GithubIntegrationError,
  githubAccountRequired,
  githubAccessDenied,
  githubAppAccessRequired,
  integrationBranchNotFound,
  repositoryPermissionInsufficient,
  upstreamUnavailable,
} from './errors.js';
import {
  GithubUiCoreClient,
  type GithubRepositoryFact,
} from './github-ui-core-client.js';

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class GithubUserApiService {
  constructor(
    private readonly github: GithubAccessService,
    private readonly discovery: GithubRepositoryDiscoveryService,
    private readonly core: GithubUiCoreClient,
  ) {}

  async getAppInfo(sessionToken: string, correlationId: string) {
    const decision = await this.core.decide(sessionToken, { action: 'VIEW_APP_INFO' }, correlationId);
    if (decision.decision !== 'ALLOW') throw githubAccessDenied();
    return this.github.getAppInfo();
  }

  async listRepositories(
    sessionToken: string,
    providerToken: string,
    projectId: string,
    cursor: string | undefined,
    limit: number | undefined,
    correlationId: string,
  ) {
    if (!providerToken?.trim() || /\s/.test(providerToken)) throw githubAccountRequired();
    const { githubUserId } = await this.discovery.getAuthenticatedUser(providerToken);
    const decision = await this.core.decide(sessionToken, {
      action: 'DISCOVER_REPOSITORIES', projectId, githubUserId,
    }, correlationId);
    if (decision.decision !== 'ALLOW' || !decision.repositoryOwnerId || !decision.repositoryOwnerType) throw githubAccessDenied();
    const page = parseCursor(cursor);
    const perPage = limit ?? DEFAULT_PAGE_SIZE;
    const result = await this.discovery.list(providerToken, page, perPage, decision.repositoryOwnerType === 'Organization'
      ? { organizationOwnerId: decision.repositoryOwnerId }
      : { personalOwnerId: decision.repositoryOwnerId });
    return {
      items: result.items.map(({ owner, permission: _permission, ...repo }) => ({
        ...repo,
        owner: { login: owner.login, type: owner.type, avatarUrl: owner.avatarUrl },
      })),
      nextCursor: result.hasNextPage ? String(page + 1) : null,
    };
  }

  async verifyRepositoryAccess(
    sessionToken: string,
    providerToken: string,
    input: { projectId: string; repositoryId: string; repositoryName: string; integrationBranch?: string },
    correlationId: string,
  ) {
    if (!providerToken?.trim() || /\s/.test(providerToken)) {
      if (input.integrationBranch) throw githubAccountRequired();
      const existingBindingDecision = await this.core.decide(sessionToken, {
        action: 'VERIFY_REPOSITORY_ACCESS',
        projectId: input.projectId,
        repositoryId: input.repositoryId,
        repositoryName: input.repositoryName,
      }, correlationId);
      if (existingBindingDecision.decision !== 'ALLOW' || !existingBindingDecision.githubUserId ||
        !existingBindingDecision.repositoryOwnerId || !existingBindingDecision.repositoryOwnerType) throw githubAccessDenied();
      return this.verifyExistingBinding(
        input,
        existingBindingDecision.githubUserId,
        existingBindingDecision.repositoryOwnerId,
        existingBindingDecision.repositoryOwnerType,
      );
    }

    const { githubUserId } = await this.discovery.getAuthenticatedUser(providerToken);
    const scope = await this.core.decide(sessionToken, {
      action: 'VERIFY_REPOSITORY_ACCESS', projectId: input.projectId, githubUserId,
    }, correlationId);
    if (scope.decision !== 'ALLOW' || !scope.repositoryOwnerId || !scope.repositoryOwnerType) throw githubAccessDenied();
    const facts = await this.repositoryFacts(providerToken, input.repositoryName, githubUserId, scope);
    if (facts.repositoryId !== input.repositoryId) throw this.repositoryNotFound();
    if (input.integrationBranch) {
      if (!facts.installationActive || !hasBindingPermission(facts.permission)) throw githubAppAccessRequired();
      const branches = await this.github.listBranches(facts.installationId as string, input.repositoryName);
      if (branches.status !== 'OK') throw lookupError(branches, 'GITHUB_APP_ACCESS_REQUIRED');
      if (!branches.value.items.some((branch) => branch.name === input.integrationBranch)) throw integrationBranchNotFound();
    }

    const decision = await this.core.decide(sessionToken, {
      action: 'VERIFY_REPOSITORY_ACCESS',
      projectId: input.projectId,
      githubUserId: facts.githubUserId,
      repositories: [facts],
      ...(input.integrationBranch ? { integrationBranch: input.integrationBranch } : {}),
    }, correlationId);
    if (decision.decision !== 'ALLOW') throw githubAccessDenied();

    return {
      repositoryId: input.repositoryId,
      repositoryName: input.repositoryName,
      status: facts.installationActive && hasBindingPermission(facts.permission) ? 'AUTHORIZED' as const : 'NOT_AUTHORIZED' as const,
      app: await this.github.getAppInfo(),
      authorizationEvidence: input.integrationBranch ? decision.authorizationEvidence ?? null : null,
    };
  }

  async listBranches(
    sessionToken: string,
    providerToken: string,
    projectId: string,
    repositoryName: string,
    correlationId: string,
  ) {
    const identity = await this.discovery.getAuthenticatedUser(providerToken);
    const scope = await this.core.decide(sessionToken, {
      action: 'LIST_REPOSITORY_BRANCHES', projectId, githubUserId: identity.githubUserId,
    }, correlationId);
    if (scope.decision !== 'ALLOW' || !scope.repositoryOwnerId || !scope.repositoryOwnerType) throw githubAccessDenied();
    const verifiedFacts = await this.repositoryFacts(providerToken, repositoryName, identity.githubUserId, scope);
    if (!verifiedFacts.installationActive) throw githubAppAccessRequired();
    if (!hasBindingPermission(verifiedFacts.permission)) throw repositoryPermissionInsufficient();
    const decision = await this.core.decide(sessionToken, {
      action: 'LIST_REPOSITORY_BRANCHES', projectId,
      githubUserId: identity.githubUserId, repositories: [verifiedFacts],
    }, correlationId);
    if (decision.decision !== 'ALLOW') throw githubAccessDenied();
    const branches = await this.github.listBranches(verifiedFacts.installationId as string, repositoryName);
    if (branches.status !== 'OK') throw lookupError(branches, 'GITHUB_APP_ACCESS_REQUIRED');
    return branches.value;
  }

  private async repositoryFacts(
    providerToken: string,
    repositoryName: string,
    verifiedGithubUserId?: string,
    expectedScope?: Pick<NonNullable<Awaited<ReturnType<GithubUiCoreClient['decide']>>>, 'repositoryOwnerId' | 'repositoryOwnerType'>,
  ): Promise<GithubRepositoryFact & { githubUserId: string }> {
    if (!providerToken?.trim() || /\s/.test(providerToken)) throw githubAccountRequired();
    const githubUserId = verifiedGithubUserId ?? (await this.discovery.getAuthenticatedUser(providerToken)).githubUserId;
    const oauthFacts = await this.discovery.getRepositoryFacts(providerToken, repositoryName);
    if (expectedScope?.repositoryOwnerId && expectedScope.repositoryOwnerType &&
      !isWithinOwnerScope(oauthFacts, expectedScope.repositoryOwnerId, expectedScope.repositoryOwnerType)) {
      throw this.repositoryNotFound();
    }
    const installationId = await this.github.resolveInstallation(repositoryName);
    if (!installationId) return { ...oauthFacts, githubUserId, installationActive: false };

    const owner = await this.github.getRepositoryOwner(installationId, repositoryName);
    if (owner.status !== 'OK') throw lookupError(owner, 'GITHUB_APP_ACCESS_REQUIRED');
    if (owner.value.repositoryId !== oauthFacts.repositoryId || owner.value.ownerId !== oauthFacts.ownerId) {
      throw this.repositoryNotFound();
    }

    const permission = await this.github.getRepositoryPermission(installationId, repositoryName, githubUserId);
    const effectivePermission = permission.status === 'OK' ? permission.value : permission.status === 'NOT_FOUND' ? 'none' : null;
    if (effectivePermission === null) throw lookupError(permission, 'REPOSITORY_PERMISSION_INSUFFICIENT');

    let organizationMembership: GithubRepositoryFact['organizationMembership'];
    if (owner.value.ownerType === 'Organization') {
      const membership = await this.github.getOrganizationMembership(installationId, owner.value.ownerLogin, githubUserId);
      if (membership.status === 'OK') organizationMembership = membership.value;
      else if (membership.status === 'NOT_FOUND') organizationMembership = { state: 'pending', role: 'member' };
      else throw lookupError(membership, 'GITHUB_APP_ACCESS_REQUIRED');
    }

    return {
      repositoryId: owner.value.repositoryId,
      repositoryName,
      ownerId: owner.value.ownerId,
      ownerType: owner.value.ownerType,
      permission: effectivePermission,
      installationId,
      installationActive: true,
      ...(organizationMembership ? { organizationMembership } : {}),
      githubUserId,
    };
  }

  private repositoryNotFound() {
    return new GithubIntegrationError('GITHUB_RESOURCE_NOT_FOUND', 'The GitHub repository is unavailable.', 404, false);
  }

  private async verifyExistingBinding(
    input: { repositoryId: string; repositoryName: string },
    githubUserId: string,
    expectedOwnerId: string,
    expectedOwnerType: 'User' | 'Organization',
  ) {
    const installationId = await this.github.resolveInstallation(input.repositoryName);
    const app = await this.github.getAppInfo();
    if (!installationId) {
      return { repositoryId: input.repositoryId, repositoryName: input.repositoryName, status: 'NOT_AUTHORIZED' as const, app };
    }

    const owner = await this.github.getRepositoryOwner(installationId, input.repositoryName);
    if (owner.status === 'UNVERIFIABLE') throw lookupError(owner, 'GITHUB_APP_ACCESS_REQUIRED');
    if (owner.status !== 'OK' || owner.value.repositoryId !== input.repositoryId ||
      owner.value.ownerId !== expectedOwnerId || owner.value.ownerType !== expectedOwnerType) {
      return { repositoryId: input.repositoryId, repositoryName: input.repositoryName, status: 'NOT_AUTHORIZED' as const, app };
    }

    const permission = await this.github.getRepositoryPermission(installationId, input.repositoryName, githubUserId);
    if (permission.status === 'UNVERIFIABLE') throw lookupError(permission, 'REPOSITORY_PERMISSION_INSUFFICIENT');
    if (permission.status !== 'OK') {
      return { repositoryId: input.repositoryId, repositoryName: input.repositoryName, status: 'NOT_AUTHORIZED' as const, app };
    }
    if (!hasBindingPermission(permission.value)) throw repositoryPermissionInsufficient();
    return { repositoryId: input.repositoryId, repositoryName: input.repositoryName, status: 'AUTHORIZED' as const, app };
  }
}

function isWithinOwnerScope(
  fact: Pick<GithubRepositoryFact, 'ownerId' | 'ownerType'>,
  ownerId: string,
  ownerType: 'User' | 'Organization',
): boolean {
  return fact.ownerId === ownerId && fact.ownerType === ownerType;
}

function parseCursor(cursor: string | undefined): number {
  const value = cursor ? Number(cursor) : 1;
  return Number.isSafeInteger(value) && value > 0 ? value : 1;
}

function hasBindingPermission(permission: GithubRepositoryFact['permission']): boolean {
  return permission === 'admin' || permission === 'maintain' || permission === 'write';
}

function lookupError<T>(result: GithubLookup<T>, missingCode: 'GITHUB_APP_ACCESS_REQUIRED' | 'REPOSITORY_PERMISSION_INSUFFICIENT'): Error {
  switch (result.status) {
    case 'NOT_FOUND':
      return new GithubIntegrationError('GITHUB_RESOURCE_NOT_FOUND', 'The GitHub resource is unavailable.', 404, false);
    case 'NOT_INSTALLED':
      return githubAppAccessRequired();
    case 'UNVERIFIABLE':
      return upstreamUnavailable();
    case 'OK':
      return missingCode === 'REPOSITORY_PERMISSION_INSUFFICIENT' ? repositoryPermissionInsufficient() : githubAppAccessRequired();
  }
}
