import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { GithubAccessService, GithubRepositoryDiscoveryService } from './github-access.service.js';
import { GithubRepositoryContentService } from './github-repository-content.service.js';
import {
  DiscoveryRequestDto,
  OrganizationMembershipRequestDto,
  OrganizationOwnersRequestDto,
  PullRequestHeadRequestDto,
  RepositoryByIdRequestDto,
  RepositoryCompareRequestDto,
  RepositoryFilesBatchRequestDto,
  RepositoryInstallationRequestDto,
  RepositoryOwnerRequestDto,
  RepositoryPermissionRequestDto,
  RepositoryTreeRequestDto,
} from './github.dto.js';
import { CoreServiceAuthGuard } from './core-service-auth.guard.js';
import { invalidRequest } from './errors.js';

@Controller('internal/v1/github')
@UseGuards(CoreServiceAuthGuard)
export class GithubIntegrationController {
  constructor(
    private readonly github: GithubAccessService,
    private readonly discovery: GithubRepositoryDiscoveryService,
    private readonly content: GithubRepositoryContentService,
  ) {}

  @Get('app')
  getAppInfo(): Promise<{ displayName: string; slug: string; configureUrl: string }> {
    return this.github.getAppInfo();
  }

  @Post('repositories/discovery')
  @HttpCode(HttpStatus.OK)
  listRepositories(
    @Headers('x-github-provider-token') providerToken: string | undefined,
    @Body() body: DiscoveryRequestDto,
  ): Promise<unknown> {
    if (!providerToken?.trim() || /\s/.test(providerToken)) throw invalidRequest();
    if (body.personalOwnerId && body.organizationOwnerId) throw invalidRequest();
    return this.discovery.list(providerToken, body.page, body.perPage, {
      personalOwnerId: body.personalOwnerId,
      organizationOwnerId: body.organizationOwnerId,
    });
  }

  @Post('repositories/installation')
  @HttpCode(HttpStatus.OK)
  async getRepositoryInstallation(@Body() body: RepositoryInstallationRequestDto): Promise<{ installationId: string | null }> {
    return { installationId: await this.github.resolveInstallation(body.repositoryName) };
  }

  @Post('repositories/owner')
  @HttpCode(HttpStatus.OK)
  getRepositoryOwner(@Body() body: RepositoryOwnerRequestDto): Promise<unknown> {
    return this.github.getRepositoryOwner(body.installationId, body.repositoryName);
  }

  @Post('repositories/by-id')
  @HttpCode(HttpStatus.OK)
  getRepositoryById(@Body() body: RepositoryByIdRequestDto): Promise<unknown> {
    return this.github.getRepositoryById(body.installationId, body.repositoryId);
  }

  @Post('repositories/permission')
  @HttpCode(HttpStatus.OK)
  getRepositoryPermission(@Body() body: RepositoryPermissionRequestDto): Promise<unknown> {
    return this.github.getRepositoryPermission(body.installationId, body.repositoryName, body.githubUserId);
  }

  @Post('organizations/installations')
  @HttpCode(HttpStatus.OK)
  listOrganizationInstallations(@Body() body: Record<string, unknown>): Promise<unknown> {
    if (!body || Array.isArray(body) || typeof body !== 'object' || Object.keys(body).length > 0) throw invalidRequest();
    return this.github.listOrganizationInstallations();
  }

  @Post('organizations/membership')
  @HttpCode(HttpStatus.OK)
  getOrganizationMembership(@Body() body: OrganizationMembershipRequestDto): Promise<unknown> {
    return this.github.getOrganizationMembership(body.installationId, body.organizationLogin, body.githubUserId);
  }

  @Post('organizations/owners')
  @HttpCode(HttpStatus.OK)
  listOrganizationOwners(@Body() body: OrganizationOwnersRequestDto): Promise<unknown> {
    return this.github.listOrganizationOwners(body.installationId, body.organizationLogin);
  }

  @Post('repositories/branches')
  @HttpCode(HttpStatus.OK)
  listBranches(@Body() body: RepositoryOwnerRequestDto): Promise<unknown> {
    return this.github.listBranches(body.installationId, body.repositoryName);
  }

  @Post('repositories/compare')
  @HttpCode(HttpStatus.OK)
  compare(@Body() body: RepositoryCompareRequestDto): Promise<unknown> {
    return this.content.compare(body.installationId, body.repositoryName, body.baseSha, body.headSha);
  }

  @Post('repositories/tree')
  @HttpCode(HttpStatus.OK)
  getTree(@Body() body: RepositoryTreeRequestDto): Promise<unknown> {
    return this.content.getTree(body.installationId, body.repositoryName, body.commitSha);
  }

  @Post('repositories/files:batch')
  @HttpCode(HttpStatus.OK)
  getFilesBatch(@Body() body: RepositoryFilesBatchRequestDto): Promise<unknown> {
    return this.content.getFilesBatch(body.installationId, body.repositoryName, body.commitSha, body.paths);
  }

  @Post('repositories/pull-request-head')
  @HttpCode(HttpStatus.OK)
  getPullRequestHead(@Body() body: PullRequestHeadRequestDto): Promise<unknown> {
    return this.content.getPullRequestHead(body.installationId, body.repositoryName, body.pullRequestNumber);
  }
}
