import { describe, expect, it, vi } from 'vitest';
import { GithubUserApiService } from './github-user-api.service.js';

const appInfo = { displayName: 'TJC', slug: 'tjc', configureUrl: 'https://github.com/apps/tjc/installations/new' };
const projectId = '7c206fa5-13f1-4f78-a3b7-1695f292a59d';

function setup() {
  const github = {
    getAppInfo: vi.fn().mockResolvedValue(appInfo),
    resolveInstallation: vi.fn().mockResolvedValue('33'),
    getRepositoryOwner: vi.fn().mockResolvedValue({
      status: 'OK', value: { repositoryId: '42', ownerId: '7', ownerLogin: 'octocat', ownerType: 'User' },
    }),
    getRepositoryPermission: vi.fn().mockResolvedValue({ status: 'OK', value: 'write' }),
    listBranches: vi.fn().mockResolvedValue({ status: 'OK', value: { items: [{ name: 'main', protected: true }] } }),
  };
  const discovery = {
    getAuthenticatedUser: vi.fn().mockResolvedValue({ githubUserId: '100' }),
    getRepositoryFacts: vi.fn().mockResolvedValue({
      repositoryId: '42', repositoryName: 'octocat/repo', ownerId: '7', ownerType: 'User', permission: 'write',
    }),
    list: vi.fn().mockResolvedValue({ items: [], hasNextPage: false }),
  };
  const core = { decide: vi.fn().mockResolvedValue({
    decision: 'ALLOW', repositoryOwnerId: '7', repositoryOwnerType: 'User', githubUserId: '100',
    authorizationEvidence: 'short-lived-proof',
  }) };
  return { service: new GithubUserApiService(github as never, discovery as never, core as never), github, discovery, core };
}

describe('GithubUserApiService', () => {
  it('filters discovery to the Core-authorized owner and uses the interoperable default page size', async () => {
    const { service, discovery, core } = setup();
    discovery.list.mockResolvedValueOnce({
      items: [{ repositoryId: '42', repositoryName: 'octocat/repo', owner: { login: 'octocat', type: 'User', avatarUrl: null }, permission: { admin: false, maintain: false, push: true, pull: true } }],
      hasNextPage: true,
    });

    await expect(service.listRepositories('session', 'provider-token', projectId, undefined, undefined, 'correlation'))
      .resolves.toMatchObject({ items: [{ repositoryId: '42' }], nextCursor: '2' });

    expect(core.decide).toHaveBeenCalledWith('session', {
      action: 'DISCOVER_REPOSITORIES', projectId, githubUserId: '100',
    }, 'correlation');
    expect(discovery.list).toHaveBeenCalledWith('provider-token', 1, 20, { personalOwnerId: '7' });
  });

  it('checks Core project scope before querying GitHub for a binding without an OAuth provider token', async () => {
    const { service, github, discovery, core } = setup();

    await expect(service.verifyRepositoryAccess('session', '', {
      projectId, repositoryId: '42', repositoryName: 'octocat/repo',
    }, 'correlation')).resolves.toEqual({
      repositoryId: '42', repositoryName: 'octocat/repo', status: 'AUTHORIZED', app: appInfo,
    });

    expect(core.decide).toHaveBeenCalledWith('session', {
      action: 'VERIFY_REPOSITORY_ACCESS', projectId, repositoryId: '42', repositoryName: 'octocat/repo',
    }, 'correlation');
    expect(core.decide.mock.invocationCallOrder[0]).toBeLessThan(github.resolveInstallation.mock.invocationCallOrder[0]);
    expect(discovery.getAuthenticatedUser).not.toHaveBeenCalled();
    expect(github.getRepositoryOwner).toHaveBeenCalledWith('33', 'octocat/repo');
    expect(github.getRepositoryPermission).toHaveBeenCalledWith('33', 'octocat/repo', '100');
  });

  it('fails closed before reading branches when Core denies the Project scope', async () => {
    const { service, github, core } = setup();
    core.decide.mockResolvedValueOnce({ decision: 'DENY' });

    await expect(service.listBranches('session', projectId, 'octocat/repo', 'correlation'))
      .rejects.toMatchObject({ code: 'GITHUB_ACCESS_DENIED' });
    expect(github.listBranches).not.toHaveBeenCalled();
  });

  it('lists branches using Core identity and App-verified facts without an OAuth provider token', async () => {
    const { service, github, discovery, core } = setup();
    core.decide
      .mockResolvedValueOnce({ decision: 'ALLOW', githubUserId: '100', repositoryOwnerId: '7', repositoryOwnerType: 'User' })
      .mockResolvedValueOnce({ decision: 'ALLOW' });

    await expect(service.listBranches('session', projectId, 'octocat/repo', 'correlation'))
      .resolves.toEqual({ items: [{ name: 'main', protected: true }] });

    expect(discovery.getAuthenticatedUser).not.toHaveBeenCalled();
    expect(discovery.getRepositoryFacts).not.toHaveBeenCalled();
    expect(core.decide).toHaveBeenNthCalledWith(1, 'session', { action: 'LIST_REPOSITORY_BRANCHES', projectId }, 'correlation');
    expect(core.decide).toHaveBeenNthCalledWith(2, 'session', expect.objectContaining({
      action: 'LIST_REPOSITORY_BRANCHES', projectId, githubUserId: '100',
      repositories: [expect.objectContaining({ repositoryId: '42', ownerId: '7', permission: 'write' })],
    }), 'correlation');
    expect(core.decide.mock.calls[1][1].repositories[0]).not.toHaveProperty('githubUserId');
    expect(github.listBranches).toHaveBeenCalledWith('33', 'octocat/repo');
  });

  it('does not expose installation IDs when returning verified user-facing access', async () => {
    const { service, core } = setup();
    core.decide
      .mockResolvedValueOnce({ decision: 'ALLOW', repositoryOwnerId: '7', repositoryOwnerType: 'User' })
      .mockResolvedValueOnce({ decision: 'ALLOW', authorizationEvidence: 'short-lived-proof' });

    const result = await service.verifyRepositoryAccess('session', 'provider-token', {
      projectId, repositoryId: '42', repositoryName: 'octocat/repo', integrationBranch: 'main',
    }, 'correlation');

    expect(result).toEqual({
      repositoryId: '42', repositoryName: 'octocat/repo', status: 'AUTHORIZED', app: appInfo,
      authorizationEvidence: 'short-lived-proof',
    });
    expect(result).not.toHaveProperty('installationId');
    expect(core.decide).toHaveBeenCalledTimes(2);
    expect(core.decide.mock.calls[1][1].repositories[0]).not.toHaveProperty('githubUserId');
  });

  it('sends only DTO-allowlisted facts when the GitHub App is not installed', async () => {
    const { service, github, core } = setup();
    github.resolveInstallation.mockResolvedValueOnce(null);
    core.decide
      .mockResolvedValueOnce({ decision: 'ALLOW', repositoryOwnerId: '7', repositoryOwnerType: 'User' })
      .mockResolvedValueOnce({ decision: 'ALLOW' });

    await expect(service.verifyRepositoryAccess('session', 'provider-token', {
      projectId, repositoryId: '42', repositoryName: 'octocat/repo',
    }, 'correlation')).resolves.toMatchObject({ status: 'NOT_AUTHORIZED' });

    const fact = core.decide.mock.calls[1][1].repositories[0];
    expect(fact).toMatchObject({ repositoryId: '42', repositoryName: 'octocat/repo', installationActive: false });
    expect(fact).not.toHaveProperty('githubUserId');
    expect(fact).not.toHaveProperty('ownerLogin');
  });
});
