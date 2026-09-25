import { describe, expect, it, vi } from 'vitest';
import { GithubAccessService, GithubRepositoryDiscoveryService } from './github-access.service.js';
import { GithubApiError, GithubIntegrationError } from './errors.js';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('GithubAccessService', () => {
  it('returns repository owner using an installation token and preserves immutable IDs as strings', async () => {
    const api = { request: vi.fn().mockResolvedValue(json({
      id: 900719925474099,
      owner: { id: 812345678901, login: 'acme', type: 'Organization' },
    })) };
    const auth = { getInstallationToken: vi.fn().mockResolvedValue('ghs-token') };
    const service = new GithubAccessService(api as never, auth as never);

    await expect(service.getRepositoryOwner('12', 'acme/widgets')).resolves.toEqual({
      status: 'OK',
      value: { repositoryId: '900719925474099', ownerId: '812345678901', ownerLogin: 'acme', ownerType: 'Organization' },
    });
    expect(api.request).toHaveBeenCalledWith('/repos/acme/widgets', 'ghs-token');
  });

  it('keeps confirmed absence separate from revoked installation and network uncertainty', async () => {
    const api = { request: vi.fn().mockResolvedValue(json({ message: 'hidden' }, 404)) };
    const auth = { getInstallationToken: vi.fn().mockResolvedValue('token') };
    const service = new GithubAccessService(api as never, auth as never);
    await expect(service.getRepositoryOwner('12', 'acme/widgets')).resolves.toEqual({ status: 'NOT_FOUND' });

    auth.getInstallationToken.mockRejectedValueOnce(new GithubApiError(404));
    await expect(service.getRepositoryOwner('12', 'acme/widgets')).resolves.toEqual({ status: 'NOT_INSTALLED' });

    auth.getInstallationToken.mockRejectedValueOnce(new Error('must not leak'));
    await expect(service.getRepositoryOwner('12', 'acme/widgets')).resolves.toEqual({ status: 'UNVERIFIABLE' });
  });

  it('resolves a permission by immutable GitHub user ID and prefers role_name over base permission', async () => {
    const api = { request: vi.fn()
      .mockResolvedValueOnce(json({ login: 'octocat' }))
      .mockResolvedValueOnce(json({ permission: 'write', role_name: 'maintain' })) };
    const auth = { getInstallationToken: vi.fn().mockResolvedValue('token') };
    const service = new GithubAccessService(api as never, auth as never);

    await expect(service.getRepositoryPermission('13', 'acme/widgets', '42')).resolves.toEqual({ status: 'OK', value: 'maintain' });
    expect(api.request).toHaveBeenNthCalledWith(1, '/user/42', 'token');
    expect(api.request).toHaveBeenNthCalledWith(2, '/repos/acme/widgets/collaborators/octocat/permission', 'token');
  });

  it('distinguishes a confirmed no-permission role from an unknown permission response', async () => {
    const api = { request: vi.fn()
      .mockResolvedValueOnce(json({ login: 'octocat' }))
      .mockResolvedValueOnce(json({ role_name: 'none', permission: 'none' }))
      .mockResolvedValueOnce(json({ role_name: 'future-custom-role', permission: 'unknown' }))
      .mockResolvedValueOnce(json({ login: 'octocat' })) };
    const auth = { getInstallationToken: vi.fn().mockResolvedValue('token') };
    const service = new GithubAccessService(api as never, auth as never);

    await expect(service.getRepositoryPermission('13', 'acme/widgets', '42')).resolves.toEqual({ status: 'NOT_FOUND' });
    await expect(service.getRepositoryPermission('13', 'acme/widgets', '42')).resolves.toEqual({ status: 'UNVERIFIABLE' });
  });

  it('reads repository details by ID and preserves current name and owner', async () => {
    const api = { request: vi.fn().mockResolvedValue(json({
      id: 321, full_name: 'new-owner/renamed', owner: { id: 9, login: 'new-owner', type: 'User' },
    })) };
    const auth = { getInstallationToken: vi.fn().mockResolvedValue('token') };
    const service = new GithubAccessService(api as never, auth as never);
    await expect(service.getRepositoryById('12', '321')).resolves.toEqual({
      status: 'OK', value: {
        repositoryId: '321', repositoryName: 'new-owner/renamed', ownerId: '9', ownerLogin: 'new-owner', ownerType: 'User',
      },
    });
    expect(api.request).toHaveBeenCalledWith('/repositories/321', 'token');
  });

  it('resolves organization membership through GitHub login and preserves pending state', async () => {
    const api = { request: vi.fn()
      .mockResolvedValueOnce(json({ login: 'octocat' }))
      .mockResolvedValueOnce(json({ role: 'member', state: 'pending' }))
      .mockResolvedValueOnce(json({ login: 'octocat' }))
      .mockResolvedValueOnce(json({ role: 'future-role', state: 'active' })) };
    const auth = { getInstallationToken: vi.fn().mockResolvedValue('token') };
    const service = new GithubAccessService(api as never, auth as never);
    await expect(service.getOrganizationMembership('8', 'acme', '42')).resolves.toEqual({
      status: 'OK', value: { role: 'member', state: 'pending' },
    });
    expect(api.request).toHaveBeenNthCalledWith(2, '/orgs/acme/memberships/octocat', 'token');
    await expect(service.getOrganizationMembership('8', 'acme', '42')).resolves.toEqual({ status: 'UNVERIFIABLE' });
  });

  it('does not return a partial owners list when its ten-page bound is reached', async () => {
    const fullOwnersPage = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, login: `owner-${i}` }));
    const api = { request: vi.fn().mockImplementation(() => Promise.resolve(json(fullOwnersPage))) };
    const auth = { getInstallationToken: vi.fn().mockResolvedValue('token') };
    const service = new GithubAccessService(api as never, auth as never);
    await expect(service.listOrganizationOwners('8', 'acme')).resolves.toEqual({ status: 'UNVERIFIABLE' });
    expect(api.request).toHaveBeenCalledTimes(10);
  });

  it('preserves branch pagination and fails closed on malformed results', async () => {
    const branches = Array.from({ length: 100 }, (_, i) => ({ name: `branch-${i}`, protected: false }));
    const api = { request: vi.fn().mockResolvedValueOnce(json(branches)).mockResolvedValueOnce(json([{ name: 'main', protected: true }])) };
    const auth = { getInstallationToken: vi.fn().mockResolvedValue('token') };
    const service = new GithubAccessService(api as never, auth as never);

    const result = await service.listBranches('13', 'acme/widgets');
    expect(result.status).toBe('OK');
    if (result.status === 'OK') expect(result.value.items).toHaveLength(101);
    expect(api.request.mock.calls[1][0]).toBe('/repos/acme/widgets/branches?per_page=100&page=2');
    expect(api.request.mock.calls[1][1]).toBe('token');
    expect(api.request.mock.calls[1][2]).toEqual({ timeoutMs: expect.any(Number) });

    api.request.mockResolvedValueOnce(json([{ name: 'main', protected: 'yes' }]));
    await expect(service.listBranches('13', 'acme/widgets')).resolves.toEqual({ status: 'UNVERIFIABLE' });
  });

  it('returns no partial branch list after its page bound', async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => ({ name: `branch-${i}`, protected: false }));
    const api = { request: vi.fn().mockImplementation(() => Promise.resolve(json(fullPage))) };
    const auth = { getInstallationToken: vi.fn().mockResolvedValue('token') };
    const service = new GithubAccessService(api as never, auth as never);

    await expect(service.listBranches('13', 'acme/widgets')).resolves.toEqual({ status: 'UNVERIFIABLE' });
    expect(api.request).toHaveBeenCalledTimes(10);
  });

  it('returns no partial branch list when the total operation deadline expires', async () => {
    const fullPage = Array.from({ length: 100 }, (_, i) => ({ name: `branch-${i}`, protected: false }));
    const api = { request: vi.fn().mockImplementation(() => Promise.resolve(json(fullPage))) };
    const auth = { getInstallationToken: vi.fn().mockResolvedValue('token') };
    const service = new GithubAccessService(api as never, auth as never);
    const nowValues = [1_000, 1_000, 31_001];
    const dateNow = vi.spyOn(Date, 'now').mockImplementation(() => nowValues.shift() ?? 31_001);

    try {
      await expect(service.listBranches('13', 'acme/widgets')).resolves.toEqual({ status: 'UNVERIFIABLE' });
      expect(api.request).toHaveBeenCalledTimes(1);
      expect(api.request.mock.calls[0][2]).toEqual({ timeoutMs: 30_000 });
    } finally {
      dateNow.mockRestore();
    }
  });

  it('treats an empty verified owners response as unverifiable', async () => {
    const api = { request: vi.fn().mockResolvedValue(json([])) };
    const auth = { getInstallationToken: vi.fn().mockResolvedValue('token') };
    const service = new GithubAccessService(api as never, auth as never);
    await expect(service.listOrganizationOwners('13', 'acme')).resolves.toEqual({ status: 'UNVERIFIABLE' });
  });
});

describe('GithubRepositoryDiscoveryService', () => {
  it('returns invalid-token only on 401 and treats 403/429 as retryable upstream errors', async () => {
    const api = { request: vi.fn().mockResolvedValue(json({ message: 'do not expose this or the token' }, 401)) };
    const service = new GithubRepositoryDiscoveryService(api as never);
    const token = 'transient-provider-token';

    await expect(service.list(token, 1, 30, {})).rejects.toMatchObject({
      code: 'GITHUB_USER_TOKEN_INVALID', status: 401, retryable: false,
    });
    api.request.mockResolvedValueOnce(json({ message: 'secondary rate limit' }, 403));
    await expect(service.list(token, 1, 30, {})).rejects.toMatchObject({
      code: 'GITHUB_UPSTREAM_UNAVAILABLE', status: 503, retryable: true,
    });
    api.request.mockResolvedValueOnce(json({}, 429));
    const error = await service.list(token, 1, 30, {}).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(GithubIntegrationError);
    expect((error as Error).message).not.toContain(token);
  });

  it('applies owner affiliation and filters by numeric owner ID without changing hasNextPage semantics', async () => {
    const api = { request: vi.fn().mockResolvedValue(json([
      { id: 1, name: 'repo', full_name: 'acme/repo', owner: { id: 8, login: 'acme', type: 'Organization', avatar_url: null }, private: true, default_branch: 'main', permissions: { push: true } },
      { id: 2, name: 'other', full_name: 'other/repo', owner: { id: 9, login: 'other', type: 'User', avatar_url: null }, private: false, default_branch: 'trunk' },
    ])) };
    const service = new GithubRepositoryDiscoveryService(api as never);

    await expect(service.list('token', 2, 2, { organizationOwnerId: '8' })).resolves.toEqual({
      items: [{
        repositoryId: '1', name: 'repo', repositoryName: 'acme/repo',
        owner: { login: 'acme', type: 'Organization', avatarUrl: null },
        private: true, defaultBranch: 'main',
        permissions: { admin: false, maintain: false, push: true, pull: false },
      }],
      hasNextPage: true,
    });
    expect(api.request).toHaveBeenCalledWith('/user/repos?per_page=2&page=2&sort=updated&affiliation=organization_member', 'token');
  });

  it('rejects simultaneous personal and organization filters', async () => {
    const service = new GithubRepositoryDiscoveryService({ request: vi.fn() } as never);
    await expect(service.list('token', 1, 10, { personalOwnerId: '1', organizationOwnerId: '2' })).rejects.toMatchObject({ status: 400 });
  });
});
