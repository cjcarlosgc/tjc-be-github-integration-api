import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { GithubIntegrationError } from '../github/errors.js';
import { GithubWebhookCoreClient } from './github-webhook-core-client.js';
import type { NormalizedWebhookEvent } from './github-webhook.types.js';

const event: NormalizedWebhookEvent = {
  schemaVersion: 1,
  deliveryId: 'delivery-1',
  eventName: 'pull_request',
  action: 'opened',
  receivedAt: '2026-09-25T12:00:00.000Z',
  data: { kind: 'IGNORED' },
};

const pullRequestEvent: NormalizedWebhookEvent = {
  ...event,
  eventName: 'pull_request',
  data: {
    kind: 'PULL_REQUEST',
    repository: { id: '1', fullName: 'acme/repo' },
    installationId: '2',
    pullRequestNumber: 3,
    pullRequest: {
      title: 'Change', draft: false, merged: false,
      createdAt: '2026-09-25T12:00:00.000Z',
      base: { ref: 'main', sha: 'a'.repeat(40) },
      head: { ref: 'feature', sha: 'b'.repeat(40) },
      userLogin: 'contributor',
    },
  },
};

function client(fetcher: typeof fetch): GithubWebhookCoreClient {
  const config = {
    get: (key: string) => ({
      CORE_API_BASE_URL: 'https://core.example.test/',
      GITHUB_INTEGRATION_TO_CORE_TOKEN: 'gh-to-core-test-token',
    })[key],
  } as unknown as ConfigService;
  return new GithubWebhookCoreClient(config, fetcher);
}

describe('GitHub webhook Core client', () => {
  it('sends the normalized event with the independent bearer and correlation id', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      deliveryId: pullRequestEvent.deliveryId, accepted: true, duplicate: false, analysisRunId: null,
    }), { status: 202 }));
    const result = await client(fetcher).deliver(pullRequestEvent, { correlationId: 'trace-1' });
    expect(fetcher).toHaveBeenCalledWith('https://core.example.test/internal/v1/github/webhook-events', expect.objectContaining({
      method: 'POST',
      redirect: 'error',
      headers: expect.objectContaining({
        Authorization: 'Bearer gh-to-core-test-token',
        'X-Correlation-ID': 'trace-1',
      }),
      body: JSON.stringify(pullRequestEvent),
    }));
    expect(result).toEqual({ status: 202, body: { deliveryId: pullRequestEvent.deliveryId, accepted: true, duplicate: false, analysisRunId: null } });
  });

  it('accepts a matching persisted duplicate response from Core', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      deliveryId: pullRequestEvent.deliveryId, accepted: true, duplicate: true, analysisRunId: 'run-1',
    }), { status: 200 }));
    await expect(client(fetcher).deliver(pullRequestEvent, {})).resolves.toMatchObject({ status: 200 });
  });

  it('rejects a duplicate acknowledgement for a non-PR event', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      deliveryId: event.deliveryId, accepted: true, duplicate: true, analysisRunId: null,
    }), { status: 200 }));
    await expect(client(fetcher).deliver(event, {})).rejects.toMatchObject({
      code: 'CORE_WEBHOOK_UNAVAILABLE', status: 503, retryable: true,
    });
  });

  it('returns only the contract fields and never reflects extra Core response properties', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      deliveryId: event.deliveryId,
      accepted: true,
      duplicate: false,
      analysisRunId: null,
      internalTrace: 'must-not-leak',
      errorDetail: 'must-not-leak',
    }), { status: 202 }));
    const result = await client(fetcher).deliver(event, {});
    expect(result.body).toEqual({ deliveryId: event.deliveryId, accepted: true, duplicate: false, analysisRunId: null });
    expect(JSON.stringify(result)).not.toContain('must-not-leak');
  });

  it('uses an 8-second deadline for Core acceptance', async () => {
    const timeoutSignal = new AbortController().signal;
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(timeoutSignal);
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      deliveryId: event.deliveryId, accepted: true, duplicate: false, analysisRunId: null,
    }), { status: 202 }));
    try {
      await client(fetcher).deliver(event, {});
      expect(timeout).toHaveBeenCalledWith(8_000);
      expect(fetcher.mock.calls[0][1]?.signal).toBe(timeoutSignal);
    } finally {
      timeout.mockRestore();
    }
  });

  it.each([
    new Response(JSON.stringify({ deliveryId: 'other', accepted: true, duplicate: false, analysisRunId: null }), { status: 202 }),
    new Response(JSON.stringify({ deliveryId: event.deliveryId, accepted: false, duplicate: false, analysisRunId: null }), { status: 202 }),
    new Response(JSON.stringify({ deliveryId: event.deliveryId, accepted: true, duplicate: true, analysisRunId: null }), { status: 202 }),
    new Response('not JSON', { status: 202 }),
    new Response('internal Core error', { status: 500 }),
  ])('maps invalid Core response to a neutral retryable error', async (response) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
    await expect(client(fetcher).deliver(event, {})).rejects.toMatchObject({
      code: 'CORE_WEBHOOK_UNAVAILABLE', status: 503, retryable: true,
    } satisfies Partial<GithubIntegrationError>);
  });

  it('maps network failures to a neutral retryable error', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error('sensitive transport detail'));
    await expect(client(fetcher).deliver(event, {})).rejects.toMatchObject({ code: 'CORE_WEBHOOK_UNAVAILABLE' });
  });

  it('maps a downstream timeout to a neutral retryable error', async () => {
    const timeout = Object.assign(new Error('sensitive timeout detail'), { name: 'TimeoutError' });
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(timeout);
    await expect(client(fetcher).deliver(event, {})).rejects.toMatchObject({
      code: 'CORE_WEBHOOK_UNAVAILABLE', status: 503, retryable: true,
    } satisfies Partial<GithubIntegrationError>);
  });
});
