import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { CoreServiceAuthGuard } from './core-service-auth.guard.js';
import { GithubAccessService, GithubRepositoryDiscoveryService } from './github-access.service.js';
import { GithubAppAuthService } from './github-app-auth.service.js';
import { GithubApiClient, GITHUB_FETCH } from './github-api.client.js';
import { GithubIntegrationController } from './github-integration.controller.js';
import { GithubUserApiController } from './github-user-api.controller.js';
import { GithubUserApiService } from './github-user-api.service.js';
import { GithubUiCoreClient, GITHUB_UI_CORE_FETCH } from './github-ui-core-client.js';
import { GithubRepositoryContentService } from './github-repository-content.service.js';
import { GithubPublicationService } from './github-publication.service.js';
import { InternalErrorFilter } from './internal-error.filter.js';

@Module({
  controllers: [GithubIntegrationController, GithubUserApiController],
  providers: [
    CoreServiceAuthGuard,
    GithubApiClient,
    GithubAppAuthService,
    GithubAccessService,
    GithubRepositoryDiscoveryService,
    GithubRepositoryContentService,
    GithubPublicationService,
    GithubUserApiService,
    GithubUiCoreClient,
    { provide: GITHUB_FETCH, useValue: fetch },
    { provide: GITHUB_UI_CORE_FETCH, useValue: fetch },
    { provide: APP_FILTER, useClass: InternalErrorFilter },
  ],
})
export class GithubModule {}
