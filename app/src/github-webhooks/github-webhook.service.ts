import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { invalidRequest, invalidWebhookSignature, webhookUnavailable } from '../github/errors.js';
import type { CorrelatedRequest } from '../correlation-id.middleware.js';
import { GithubWebhookCoreClient } from './github-webhook-core-client.js';
import { normalizeGithubWebhook } from './github-webhook-normalizer.js';
import type { GitHubWebhookAcceptedResponse } from './github-webhook.types.js';
import { verifyGithubWebhookSignature } from './github-webhook-signature.js';

export interface VerifiedWebhookResult {
  status: 200 | 202;
  body: GitHubWebhookAcceptedResponse;
}

@Injectable()
export class GithubWebhookService {
  constructor(
    private readonly config: ConfigService,
    private readonly core: GithubWebhookCoreClient,
  ) {}

  async receive(
    rawBody: unknown,
    deliveryHeader: string | string[] | undefined,
    eventHeader: string | string[] | undefined,
    signatureHeader: string | string[] | undefined,
    request: Pick<CorrelatedRequest, 'correlationId'> & { webhookReceivedAt?: Date },
  ): Promise<VerifiedWebhookResult> {
    const secret = this.config.get<string>('GITHUB_WEBHOOK_SECRET');
    if (!secret) throw webhookUnavailable();
    if (!Buffer.isBuffer(rawBody)) throw invalidRequest();

    const deliveryId = singleHeader(deliveryHeader);
    const eventName = singleHeader(eventHeader);
    const signature = singleHeader(signatureHeader);
    if (!deliveryId || !eventName) throw invalidRequest();
    if (!signature) throw invalidWebhookSignature();

    verifyGithubWebhookSignature(rawBody, signature, secret);

    let payload: unknown;
    try {
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(rawBody);
      payload = JSON.parse(decoded) as unknown;
    } catch {
      throw invalidRequest();
    }

    const event = normalizeGithubWebhook(deliveryId, eventName, payload, request.webhookReceivedAt ?? new Date());
    return this.core.deliver(event, request);
  }
}

function singleHeader(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}
