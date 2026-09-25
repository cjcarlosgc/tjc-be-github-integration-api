import { describe, expect, it, vi } from 'vitest';
import { correlationIdStorage } from '../correlation-id.middleware.js';
import { GithubApiClient } from './github-api.client.js';
import { GithubApiError } from './errors.js';

describe('GithubApiClient', () => {
  it('sends authenticated, versioned, bounded requests with correlation context', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const client = new GithubApiClient(fetcher);

    await correlationIdStorage.run('trace-001', () => client.request('/app', 'app-token'));
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.github.com/app');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer app-token',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'X-Correlation-ID': 'trace-001',
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('allows a request-specific deadline up to the configured maximum', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(new AbortController().signal);
    const client = new GithubApiClient(vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
    await client.request('/repos/acme/widgets/git/blobs', 'app-token', { timeoutMs: 180_000 });
    expect(timeout).toHaveBeenCalledWith(180_000);
    timeout.mockRestore();
  });

  it('drops network exception content instead of preserving secret-bearing causes', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('request included private token material'));
    const client = new GithubApiClient(fetcher);
    const error = await client.request('/app', 'token').catch((value: unknown) => value);
    expect(error).toBeInstanceOf(GithubApiError);
    expect((error as Error).message).toBe('GitHub API request failed.');
    expect((error as Error & { cause?: unknown }).cause).toBeUndefined();
  });
});
