import { Body, Controller, Get, Header, Headers, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { CorrelatedRequest } from '../correlation-id.middleware.js';
import { GithubIntegrationError } from './errors.js';
import { GithubUserApiService } from './github-user-api.service.js';
import {
  ListUserRepositoriesQueryDto,
  ListUserRepositoryBranchesQueryDto,
  VerifyUserRepositoryAccessDto,
} from './github-user-api.dto.js';

type UserApiRequest = Request & CorrelatedRequest;

@Controller('v1/github')
export class GithubUserApiController {
  constructor(private readonly userApi: GithubUserApiService) {}

  @Get('app')
  @Header('Cache-Control', 'no-store')
  getAppInfo(@Req() request: UserApiRequest): Promise<unknown> {
    return this.userApi.getAppInfo(sessionToken(request), correlationId(request));
  }

  @Get('repositories')
  @Header('Cache-Control', 'no-store')
  listRepositories(
    @Req() request: UserApiRequest,
    @Headers('x-github-provider-token') providerToken: string | string[] | undefined,
    @Query() query: ListUserRepositoriesQueryDto,
  ): Promise<unknown> {
    return this.userApi.listRepositories(
      sessionToken(request), headerValue(providerToken), query.projectId,
      query.cursor, query.limit, correlationId(request),
    );
  }

  @Post('repositories/verify-access')
  @Header('Cache-Control', 'no-store')
  verifyRepositoryAccess(
    @Req() request: UserApiRequest,
    @Headers('x-github-provider-token') providerToken: string | string[] | undefined,
    @Body() body: VerifyUserRepositoryAccessDto,
  ): Promise<unknown> {
    return this.userApi.verifyRepositoryAccess(
      sessionToken(request), headerValue(providerToken), body, correlationId(request),
    );
  }

  @Get('repositories/:owner/:repo/branches')
  @Header('Cache-Control', 'no-store')
  listBranches(
    @Req() request: UserApiRequest,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query() query: ListUserRepositoryBranchesQueryDto,
  ): Promise<unknown> {
    return this.userApi.listBranches(
      sessionToken(request), query.projectId,
      `${owner}/${repo}`, correlationId(request),
    );
  }
}

function sessionToken(request: Request): string {
  const authorization = request.headers.authorization;
  const match = typeof authorization === 'string' ? /^Bearer ([^\s]+)$/.exec(authorization) : null;
  if (!match) throw new GithubIntegrationError('AUTH_REQUIRED', 'A valid user session is required.', 401, false);
  return match[1];
}

function headerValue(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}

function correlationId(request: UserApiRequest): string {
  return request.correlationId ?? 'missing-correlation-id';
}
