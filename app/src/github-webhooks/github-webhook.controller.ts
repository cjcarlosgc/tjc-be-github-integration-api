import { Controller, Headers, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { CorrelatedRequest } from '../correlation-id.middleware.js';
import { GithubWebhookService } from './github-webhook.service.js';

type RawWebhookRequest = Request & CorrelatedRequest & { body: Buffer; webhookReceivedAt?: Date };

@Controller('integrations/github/webhooks')
export class GithubWebhookController {
  constructor(private readonly webhooks: GithubWebhookService) {}

  @Post()
  @HttpCode(202)
  async receive(
    @Req() request: RawWebhookRequest,
    @Headers('x-github-delivery') deliveryId: string | string[] | undefined,
    @Headers('x-github-event') eventName: string | string[] | undefined,
    @Headers('x-hub-signature-256') signature: string | string[] | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const result = await this.webhooks.receive(request.body, deliveryId, eventName, signature, request);
    response.status(result.status).json(result.body);
  }
}
