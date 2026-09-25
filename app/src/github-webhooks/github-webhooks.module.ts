import { Module } from '@nestjs/common';
import { GithubWebhookController } from './github-webhook.controller.js';
import { GithubWebhookCoreClient, GITHUB_WEBHOOK_FETCH } from './github-webhook-core-client.js';
import { GithubWebhookService } from './github-webhook.service.js';

@Module({
  controllers: [GithubWebhookController],
  providers: [
    GithubWebhookService,
    GithubWebhookCoreClient,
    { provide: GITHUB_WEBHOOK_FETCH, useValue: fetch },
  ],
})
export class GithubWebhooksModule {}
