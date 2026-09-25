import { generateKeyPairSync } from 'node:crypto';
import { jwtVerify } from 'jose';
import { describe, expect, it, vi } from 'vitest';
import { GithubAppAuthService } from './github-app-auth.service.js';
import { GithubApiError, GithubIntegrationError } from './errors.js';

function appKey(): { encoded: string; publicKey: ReturnType<typeof generateKeyPairSync>['publicKey'] } {
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const pem = pair.privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();
  return { encoded: Buffer.from(pem).toString('base64'), publicKey: pair.publicKey };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('GithubAppAuthService', () => {
  it('signs a short-lived App JWT and caches installation tokens only in memory', async () => {
    const key = appKey();
    const api = { request: vi.fn().mockResolvedValue(json({
      token: 'ghs-format-is-opaque', expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
    })) };
    const config = { get: (name: string) => name === 'GITHUB_APP_ID' ? '4935151' : key.encoded };
    const service = new GithubAppAuthService(config as never, api as never);
    const jwt = await service.signAppJwt();
    const verified = await jwtVerify(jwt, key.publicKey);
    expect(verified.protectedHeader.alg).toBe('RS256');
    expect(verified.payload.iss).toBe('4935151');
    expect((verified.payload.exp ?? 0) - (verified.payload.iat ?? 0)).toBeLessThanOrEqual(9 * 60 + 30);

    await expect(service.getInstallationToken('12')).resolves.toBe('ghs-format-is-opaque');
    await expect(service.getInstallationToken('12')).resolves.toBe('ghs-format-is-opaque');
    expect(api.request).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(api.request.mock.calls)).not.toContain('ghs-format-is-opaque');
  });

  it('maps missing installations without exposing the upstream response body', async () => {
    const key = appKey();
    const api = { request: vi.fn().mockResolvedValue(json({ message: 'private upstream detail' }, 404)) };
    const config = { get: (name: string) => name === 'GITHUB_APP_ID' ? '1' : key.encoded };
    const service = new GithubAppAuthService(config as never, api as never);

    await expect(service.getInstallationToken('12')).rejects.toBeInstanceOf(GithubApiError);
    api.request.mockResolvedValueOnce(json({ message: 'private upstream detail' }, 503));
    const error = await service.getAppInfo().catch((value: unknown) => value);
    expect(error).toBeInstanceOf(GithubIntegrationError);
    expect((error as Error).message).not.toContain('private upstream detail');
  });

  it('does not classify an ambiguous GitHub App 403 as broken App credentials', async () => {
    const key = appKey();
    const api = { request: vi.fn().mockResolvedValue(json({ message: 'secondary rate limit' }, 403)) };
    const config = { get: (name: string) => name === 'GITHUB_APP_ID' ? '1' : key.encoded };
    const service = new GithubAppAuthService(config as never, api as never);
    await expect(service.getAppInfo()).rejects.toMatchObject({
      code: 'GITHUB_UPSTREAM_UNAVAILABLE', status: 503, retryable: true,
    });
  });

  it('lists organization installations only, preserves suspension, and excludes personal installs', async () => {
    const key = appKey();
    const api = { request: vi.fn().mockResolvedValue(json([
      { id: 1, account: { id: 101, login: 'owner', type: 'User' } },
      { id: 2, account: { id: 202, login: 'acme', type: 'Organization', avatar_url: 'https://avatars.example/acme' }, suspended_at: '2026-01-01T00:00:00Z' },
    ])) };
    const config = { get: (name: string) => name === 'GITHUB_APP_ID' ? '1' : key.encoded };
    const service = new GithubAppAuthService(config as never, api as never);

    await expect(service.listOrganizationInstallations()).resolves.toEqual({ status: 'OK', value: [{
      installationId: '2', organizationId: '202', organizationLogin: 'acme',
      avatarUrl: 'https://avatars.example/acme', suspended: true,
    }] });
    expect(api.request.mock.calls[0][0]).toBe('/app/installations?per_page=100&page=1');
  });

  it('does not interpret an installations endpoint 404 as an empty installation list', async () => {
    const key = appKey();
    const api = { request: vi.fn().mockResolvedValue(json({ message: 'no app visibility' }, 404)) };
    const config = { get: (name: string) => name === 'GITHUB_APP_ID' ? '1' : key.encoded };
    const service = new GithubAppAuthService(config as never, api as never);
    await expect(service.listOrganizationInstallations()).resolves.toEqual({ status: 'UNVERIFIABLE' });
  });
});
