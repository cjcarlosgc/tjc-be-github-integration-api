import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CoreServiceAuthGuard } from './core-service-auth.guard.js';
import { GithubAccessService, GithubRepositoryDiscoveryService } from './github-access.service.js';
import { GithubAppAuthService } from './github-app-auth.service.js';
import { GithubApiClient, GITHUB_FETCH } from './github-api.client.js';
import { GithubIntegrationController } from './github-integration.controller.js';
import { InternalErrorFilter } from './internal-error.filter.js';

@Module({
  controllers: [GithubIntegrationController],
  providers: [
    CoreServiceAuthGuard,
    GithubApiClient,
    GithubAppAuthService,
    GithubAccessService,
    GithubRepositoryDiscoveryService,
    { provide: GITHUB_FETCH, useValue: fetch },
    { provide: APP_FILTER, useClass: InternalErrorFilter },
  ],
})
export class GithubModule {}
