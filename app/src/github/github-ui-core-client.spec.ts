import { describe, expect, it, vi } from 'vitest';
import { Logger } from '@nestjs/common';
import { GithubIntegrationError } from './errors.js';
import { GithubUiCoreClient } from './github-ui-core-client.js';

const serviceToken = 'test-only-gh-to-core-token';
const sessionToken = 'supabase-session-jwt';
const correlationId = 'test.trace-001';

function setup(fetcher: typeof fetch = vi.fn<typeof fetch>()) {
  const config = {
    get: (key: string) => key === 'CORE_API_BASE_URL'
      ? 'https://core.example.test/'
      : key === 'GITHUB_INTEGRATION_TO_CORE_TOKEN' ? serviceToken : undefined,
  };
  return { client: new GithubUiCoreClient(config as never, fetcher), fetcher };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('GithubUiCoreClient', () => {
  it('sends separate service and user credentials without forwarding a GitHub provider token', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({
      decision: 'ALLOW', repositoryOwnerId: '7', repositoryOwnerType: 'User',
    }));
    const { client } = setup(fetcher);
    const requestBody = { action: 'DISCOVER_REPOSITORIES' as const, projectId: '7c206fa5-13f1-4f78-a3b7-1695f292a59d', githubUserId: '100' };

    await expect(client.decide(sessionToken, requestBody, correlationId)).resolves.toMatchObject({ decision: 'ALLOW' });

    const [url, init] = fetcher.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(String(url)).toBe('https://core.example.test/internal/v1/github/authorization-decisions');
    expect(headers.get('authorization')).toBe(`Bearer ${serviceToken}`);
    expect(headers.get('x-platform-user-token')).toBe(`Bearer ${sessionToken}`);
    expect(headers.get('x-correlation-id')).toBe(correlationId);
    expect(headers.has('x-github-provider-token')).toBe(false);
    expect(JSON.parse(String(init?.body))).toEqual(requestBody);
    expect(String(init?.body)).not.toContain('gho_');
    expect(init?.redirect).toBe('error');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('preserves an explicit Core denial for the caller to fail closed', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({ decision: 'DENY' }));
    const { client } = setup(fetcher);

    await expect(client.decide(sessionToken, { action: 'VIEW_APP_INFO' }, correlationId))
      .resolves.toEqual({ decision: 'DENY' });
  });

  it('maps only recognized Core authorization errors and hides arbitrary error bodies', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ code: 'PROJECT_ROLE_INSUFFICIENT' }, 403))
      .mockResolvedValueOnce(json({ code: 'private-core-detail', accessToken: 'secret' }, 403));
    const { client } = setup(fetcher);

    await expect(client.decide(sessionToken, { action: 'DISCOVER_REPOSITORIES' }, correlationId))
      .rejects.toMatchObject({ code: 'PROJECT_ROLE_INSUFFICIENT', status: 403, retryable: false });
    const error = await client.decide(sessionToken, { action: 'VIEW_APP_INFO' }, correlationId).catch((value: unknown) => value);
    expect(error).toBeInstanceOf(GithubIntegrationError);
    expect(error).toMatchObject({ code: 'CORE_AUTHORIZATION_UNAVAILABLE', status: 503, retryable: true });
    expect((error as Error).message).not.toContain('private-core-detail');
    expect((error as Error).message).not.toContain('secret');
  });

  it('fails closed on timeout/network errors, malformed success bodies, and invalid credentials configuration', async () => {
    const failedFetch = vi.fn<typeof fetch>().mockRejectedValue(new Error('redirect or timeout detail'));
    const { client } = setup(failedFetch);
    const networkError = await client.decide(sessionToken, { action: 'VIEW_APP_INFO' }, correlationId)
      .catch((value: unknown) => value);
    expect(networkError).toMatchObject({ code: 'CORE_AUTHORIZATION_UNAVAILABLE', status: 503, retryable: true });
    expect((networkError as Error).message).not.toContain('redirect or timeout detail');

    const malformedFetch = vi.fn<typeof fetch>().mockResolvedValue(json({ decision: 'ALLOW', role: 'ADMIN' }));
    const malformed = await setup(malformedFetch).client
      .decide(sessionToken, { action: 'VIEW_APP_INFO' }, correlationId)
      .catch((value: unknown) => value);
    expect(malformed).toMatchObject({ code: 'CORE_AUTHORIZATION_UNAVAILABLE', status: 503, retryable: true });

    const config = { get: () => undefined };
    const neverFetch = vi.fn<typeof fetch>();
    const misconfigured = await new GithubUiCoreClient(config as never, neverFetch)
      .decide(sessionToken, { action: 'VIEW_APP_INFO' }, correlationId)
      .catch((value: unknown) => value);
    expect(misconfigured).toMatchObject({ code: 'CORE_AUTHORIZATION_UNAVAILABLE', status: 503 });
    expect(neverFetch).not.toHaveBeenCalled();
  });

  it('logs Core transport failures with safe diagnostics and without credentials or response bodies', async () => {
    const responseSecret = 'private-core-response';
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(json({ code: responseSecret }, 500));
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const { client } = setup(fetcher);

    try {
      await expect(client.decide(sessionToken, { action: 'DISCOVER_REPOSITORIES' }, correlationId))
        .rejects.toMatchObject({ code: 'CORE_AUTHORIZATION_UNAVAILABLE' });
      const entry = String(warn.mock.calls[0]?.[0]);
      expect(entry).toContain('"event":"github_ui_core_authorization_failed"');
      expect(entry).toContain('"reason":"http_response"');
      expect(entry).toContain('"httpStatus":500');
      expect(entry).toContain('"coreCode":"UNRECOGNIZED"');
      expect(entry).not.toContain(responseSecret);
      expect(entry).not.toContain(serviceToken);
      expect(entry).not.toContain(sessionToken);
    } finally {
      warn.mockRestore();
    }
  });
});
