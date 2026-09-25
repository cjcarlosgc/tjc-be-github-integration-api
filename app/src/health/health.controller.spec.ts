import { describe, expect, it, vi } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { HealthController } from './health.controller.js';
import { generateKeyPairSync } from 'node:crypto';

function appKey(): string {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  return Buffer.from(privateKey.export({ type: 'pkcs1', format: 'pem' }).toString()).toString('base64');
}

function configWithToken(token?: string, complete = false): ConfigService {
  return {
    get: vi.fn((key: string) => {
      if (key === 'CORE_TO_GITHUB_INTEGRATION_TOKEN') return token;
      if (key === 'GITHUB_APP_ID') return complete ? '4935151' : undefined;
      if (key === 'GITHUB_APP_PRIVATE_KEY_BASE64') return complete ? appKey() : undefined;
      return undefined;
    }),
  } as unknown as ConfigService;
}

function responseStub(): Response {
  return {
    status: vi.fn(),
  } as unknown as Response;
}

describe('GET /health', () => {
  it('returns live but not ready when the service bearer is absent', () => {
    const response = responseStub();
    const controller = new HealthController(configWithToken());

    const health = controller.getHealth(response);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(health).toEqual({
      status: 'not_ready',
      checks: { liveness: 'ok', readiness: 'not_ready' },
    });
  });

  it('reports local readiness without exposing credential contents', () => {
    const response = responseStub();
    const token = 'test-only-service-token';
    const controller = new HealthController(configWithToken(token, true));

    const health = controller.getHealth(response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(health).toEqual({
      status: 'ok',
      checks: { liveness: 'ok', readiness: 'ok' },
    });
    expect(JSON.stringify(health)).not.toContain(token);
  });

  it('does not query GitHub or Core', () => {
    const response = responseStub();
    const config = configWithToken('test-only-service-token', true);
    const controller = new HealthController(config);

    controller.getHealth(response);

    expect(config.get).toHaveBeenCalledTimes(3);
    expect(config.get).toHaveBeenCalledWith('CORE_TO_GITHUB_INTEGRATION_TOKEN');
  });
});
