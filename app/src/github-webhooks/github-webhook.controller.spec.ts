import 'reflect-metadata';
import { Module } from '@nestjs/common';
import { APP_FILTER, NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { correlationIdMiddleware } from '../correlation-id.middleware.js';
import { InternalErrorFilter } from '../github/internal-error.filter.js';
import { configureRequestBodyParsers } from '../request-body-parsers.js';
import { GithubWebhookController } from './github-webhook.controller.js';
import { GithubWebhookService } from './github-webhook.service.js';

const bodyLimit = 25 * 1024 * 1024;
const webhookService = {
  receive: vi.fn().mockResolvedValue({
    status: 202,
    body: { deliveryId: 'test-delivery', accepted: true, duplicate: false, analysisRunId: null },
  }),
};

@Module({
  controllers: [GithubWebhookController],
  providers: [
    { provide: GithubWebhookService, useValue: webhookService },
    { provide: APP_FILTER, useClass: InternalErrorFilter },
  ],
})
class WebhookControllerTestModule {}

describe('public GitHub webhook ingress', () => {
  let app: INestApplication;
  let url: string;

  beforeAll(async () => {
    app = await NestFactory.create(WebhookControllerTestModule, { logger: false, bodyParser: false });
    app.use(correlationIdMiddleware);
    configureRequestBodyParsers(app, 'test-only-core-token');
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    url = `http://127.0.0.1:${address.port}/integrations/github/webhooks`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('accepts a request body exactly at the 25 MB GitHub limit', async () => {
    const body = Buffer.alloc(bodyLimit, 0x20);
    body.write('{}');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    expect(response.status).toBe(202);
    expect(webhookService.receive).toHaveBeenCalledOnce();
    expect(webhookService.receive.mock.calls[0][0]).toHaveLength(bodyLimit);
    expect(webhookService.receive.mock.calls[0][4]).toHaveProperty('webhookReceivedAt');
  });

  it('rejects a request body above the 25 MB limit before invoking the controller', async () => {
    webhookService.receive.mockClear();
    const body = Buffer.alloc(bodyLimit + 1, 0x20);
    body.write('{}');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ code: 'INVALID_REQUEST', retryable: false });
    expect(webhookService.receive).not.toHaveBeenCalled();
  });
});
