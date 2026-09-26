import 'reflect-metadata';
import { Module, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { APP_FILTER, NestFactory } from '@nestjs/core';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { correlationIdMiddleware } from '../correlation-id.middleware.js';
import { GithubUserApiController } from './github-user-api.controller.js';
import { GithubUserApiService } from './github-user-api.service.js';
import { InternalErrorFilter } from './internal-error.filter.js';

const sessionToken = 'supabase-session-jwt';
const providerToken = 'github-provider-token';
const projectId = '7c206fa5-13f1-4f78-a3b7-1695f292a59d';

const userApi = {
  getAppInfo: vi.fn().mockResolvedValue({ displayName: 'TJC', slug: 'tjc', configureUrl: 'https://github.com/apps/tjc/installations/new' }),
  listRepositories: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
  verifyRepositoryAccess: vi.fn().mockResolvedValue({ repositoryId: '42', repositoryName: 'octocat/repo', status: 'AUTHORIZED' }),
  listBranches: vi.fn().mockResolvedValue({ items: [{ name: 'main', protected: true }] }),
};

@Module({
  controllers: [GithubUserApiController],
  providers: [
    { provide: GithubUserApiService, useValue: userApi },
    { provide: APP_FILTER, useClass: InternalErrorFilter },
  ],
})
class GithubUserApiControllerTestModule {}

describe('authenticated GitHub user API routes', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(GithubUserApiControllerTestModule, { logger: false });
    app.use(correlationIdMiddleware);
    app.useGlobalPipes(new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transformOptions: { enableImplicitConversion: false },
    }));
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/v1/github`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires a Supabase session on every user route before calling the service', async () => {
    const requests: Array<[string, RequestInit?]> = [
      ['/app'],
      [`/repositories?projectId=${projectId}`],
      ['/repositories/verify-access', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, repositoryId: '42', repositoryName: 'octocat/repo' }),
      }],
      [`/repositories/octocat/repo/branches?projectId=${projectId}`],
    ];

    for (const [path, init] of requests) {
      const response = await fetch(`${baseUrl}${path}`, init);
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ code: 'AUTH_REQUIRED', retryable: false });
    }
    expect(userApi.getAppInfo).not.toHaveBeenCalled();
    expect(userApi.listRepositories).not.toHaveBeenCalled();
    expect(userApi.verifyRepositoryAccess).not.toHaveBeenCalled();
    expect(userApi.listBranches).not.toHaveBeenCalled();
  });

  it('uses no-store responses and forwards the session/provider tokens only as request context', async () => {
    const appResponse = await fetch(`${baseUrl}/app`, {
      headers: { Authorization: `Bearer ${sessionToken}`, 'X-Correlation-ID': 'ui.trace-01' },
    });
    expect(appResponse.status).toBe(200);
    expect(appResponse.headers.get('cache-control')).toBe('no-store');
    expect(await appResponse.json()).toMatchObject({ slug: 'tjc' });
    expect(userApi.getAppInfo).toHaveBeenCalledWith(sessionToken, 'ui.trace-01');

    const discovery = await fetch(`${baseUrl}/repositories?projectId=${projectId}&limit=10`, {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        'X-GitHub-Provider-Token': providerToken,
        'X-Correlation-ID': 'ui.trace-02',
      },
    });
    expect(discovery.status).toBe(200);
    expect(userApi.listRepositories).toHaveBeenCalledWith(sessionToken, providerToken, projectId, undefined, 10, 'ui.trace-02');
  });

  it('rejects unexpected body/query fields before dispatching a user operation', async () => {
    const extraBody = await fetch(`${baseUrl}/repositories/verify-access`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, repositoryId: '42', repositoryName: 'octocat/repo', installationId: '13' }),
    });
    expect(extraBody.status).toBe(400);
    expect(await extraBody.json()).toMatchObject({ code: 'INVALID_REQUEST', retryable: false });

    const extraQuery = await fetch(`${baseUrl}/repositories?projectId=${projectId}&installationId=13`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    expect(extraQuery.status).toBe(400);
    expect(await extraQuery.json()).toMatchObject({ code: 'INVALID_REQUEST', retryable: false });
    expect(userApi.verifyRepositoryAccess).not.toHaveBeenCalled();
    expect(userApi.listRepositories).toHaveBeenCalledTimes(1);
  });
});
