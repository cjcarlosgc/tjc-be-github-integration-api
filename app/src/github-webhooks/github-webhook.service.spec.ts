import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { GithubIntegrationError } from '../github/errors.js';
import { GithubWebhookCoreClient } from './github-webhook-core-client.js';
import { GithubWebhookService } from './github-webhook.service.js';

const secret = 'test-only-webhook-secret';

function signature(body: Buffer): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

function service(coreDeliver = vi.fn()): { instance: GithubWebhookService; deliver: ReturnType<typeof vi.fn> } {
  const config = { get: (key: string) => key === 'GITHUB_WEBHOOK_SECRET' ? secret : undefined } as unknown as ConfigService;
  const core = { deliver: coreDeliver } as unknown as GithubWebhookCoreClient;
  return { instance: new GithubWebhookService(config, core), deliver: coreDeliver };
}

describe('GitHub webhook service', () => {
  it('fails neutrally when the webhook secret is not configured', async () => {
    const core = { deliver: vi.fn() } as unknown as GithubWebhookCoreClient;
    const config = { get: () => undefined } as unknown as ConfigService;
    const instance = new GithubWebhookService(config, core);
    await expect(instance.receive(Buffer.from('{}'), 'delivery-0', 'push', 'sha256=bad', {}))
      .rejects.toMatchObject({ code: 'GITHUB_WEBHOOK_UNAVAILABLE', status: 503, retryable: false });
    expect(core.deliver).not.toHaveBeenCalled();
  });

  it('checks HMAC before parsing JSON bytes', async () => {
    const { instance, deliver } = service();
    await expect(instance.receive(Buffer.from('{not-json'), 'delivery-1', 'push', 'sha256=invalid', {}))
      .rejects.toMatchObject({ code: 'INVALID_WEBHOOK_SIGNATURE', status: 401 });
    expect(deliver).not.toHaveBeenCalled();
  });

  it('rejects invalid signed JSON and missing event metadata before calling Core', async () => {
    const { instance, deliver } = service();
    const invalidJson = Buffer.from('{not-json');
    await expect(instance.receive(invalidJson, 'delivery-1', 'push', signature(invalidJson), {}))
      .rejects.toMatchObject({ code: 'INVALID_REQUEST', status: 400 });

    const body = Buffer.from('{}');
    await expect(instance.receive(body, 'delivery-1', undefined, signature(body), {}))
      .rejects.toMatchObject({ code: 'INVALID_REQUEST', status: 400 });
    expect(deliver).not.toHaveBeenCalled();
  });

  it('delivers only the normalized allowlist to Core after verification', async () => {
    const deliver = vi.fn().mockResolvedValue({
      status: 202,
      body: { deliveryId: 'delivery-2', accepted: true, duplicate: false, analysisRunId: null },
    });
    const { instance } = service(deliver);
    const body = Buffer.from(JSON.stringify({
      action: 'completed',
      repository: { id: 1, full_name: 'acme/widgets', secret: 'never-forward' },
      unexpected: 'never-forward',
    }));
    const receivedAt = new Date('2026-09-25T12:00:00.000Z');
    await expect(instance.receive(body, 'delivery-2', 'repository', signature(body), {
      correlationId: 'trace-2', webhookReceivedAt: receivedAt,
    }))
      .resolves.toMatchObject({ status: 202 });
    expect(deliver).toHaveBeenCalledWith(expect.objectContaining({
      deliveryId: 'delivery-2',
      receivedAt: receivedAt.toISOString(),
      data: { kind: 'REPOSITORY', repository: { id: '1', fullName: 'acme/widgets', owner: null }, installationId: null },
    }), { correlationId: 'trace-2', webhookReceivedAt: receivedAt });
    expect(JSON.stringify(deliver.mock.calls[0])).not.toContain('never-forward');
  });

  it('rejects duplicate header instances rather than choosing an ambiguous value', async () => {
    const { instance } = service();
    await expect(instance.receive(Buffer.from('{}'), ['delivery-1', 'delivery-2'], 'push', 'sha256=bad', {}))
      .rejects.toBeInstanceOf(GithubIntegrationError);
  });
});
