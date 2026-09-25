import 'reflect-metadata';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { CoreServiceAuthGuard } from './core-service-auth.guard.js';
import { GithubAccessService, GithubRepositoryDiscoveryService } from './github-access.service.js';
import { GithubIntegrationController } from './github-integration.controller.js';
import { GithubRepositoryContentService } from './github-repository-content.service.js';
import { InternalErrorFilter } from './internal-error.filter.js';
import { correlationIdMiddleware } from '../correlation-id.middleware.js';

const serviceToken = 'test-only-core-to-gh-token';
const access = {
  getAppInfo: vi.fn().mockResolvedValue({ displayName: 'TJC', slug: 'tjc', configureUrl: 'https://github.com/apps/tjc/installations/new' }),
  listOrganizationInstallations: vi.fn().mockResolvedValue({ status: 'OK', value: [] }),
};
const discovery = { list: vi.fn() };
const content = {
  compare: vi.fn().mockResolvedValue({ status: 'OK', value: { files: [] } }),
  getTree: vi.fn().mockResolvedValue({ status: 'OK', value: { paths: [], truncated: false } }),
  getFilesBatch: vi.fn().mockResolvedValue({ status: 'OK', value: { files: [] } }),
  getPullRequestHead: vi.fn().mockResolvedValue({ status: 'OK', value: { headSha: 'head-sha', state: 'open' } }),
};

@Module({
  controllers: [GithubIntegrationController],
  providers: [
    CoreServiceAuthGuard,
    { provide: ConfigService, useValue: { get: (key: string) => key === 'CORE_TO_GITHUB_INTEGRATION_TOKEN' ? serviceToken : undefined } },
    { provide: GithubAccessService, useValue: access },
    { provide: GithubRepositoryDiscoveryService, useValue: discovery },
    { provide: GithubRepositoryContentService, useValue: content },
    { provide: APP_FILTER, useClass: InternalErrorFilter },
  ],
})
class GithubControllerTestModule {}

describe('private GitHub integration routes', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(GithubControllerTestModule, { logger: false });
    app.use(correlationIdMiddleware);
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true, forbidUnknownValues: true }));
    await app.listen(0, '127.0.0.1');
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}/internal/v1/github`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires the Core service bearer before invoking private operations', async () => {
    const response = await fetch(`${baseUrl}/app`);
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: 'SERVICE_UNAUTHORIZED', retryable: false });
    expect(access.getAppInfo).not.toHaveBeenCalled();
  });

  it('returns the public App information and propagates a bounded correlation ID', async () => {
    const response = await fetch(`${baseUrl}/app`, {
      headers: { Authorization: `Bearer ${serviceToken}`, 'X-Correlation-ID': 'test.trace-001' },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('x-correlation-id')).toBe('test.trace-001');
    expect(await response.json()).toEqual({ displayName: 'TJC', slug: 'tjc', configureUrl: 'https://github.com/apps/tjc/installations/new' });
  });

  it('rejects unknown JSON properties and requires the ephemeral provider token header', async () => {
    const headers = { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' };
    const extra = await fetch(`${baseUrl}/organizations/installations`, { method: 'POST', headers, body: JSON.stringify({ unexpected: true }) });
    expect(extra.status).toBe(400);
    expect(await extra.json()).toMatchObject({ code: 'INVALID_REQUEST', retryable: false });

    const missingToken = await fetch(`${baseUrl}/repositories/discovery`, { method: 'POST', headers, body: JSON.stringify({ page: 1, perPage: 20 }) });
    expect(missingToken.status).toBe(400);
    const error = await missingToken.json();
    expect(error).toMatchObject({ code: 'INVALID_REQUEST' });
    expect(JSON.stringify(error)).not.toContain(serviceToken);

    const invalidPage = await fetch(`${baseUrl}/repositories/discovery`, {
      method: 'POST',
      headers: { ...headers, 'X-GitHub-Provider-Token': 'ephemeral-token' },
      body: JSON.stringify({ page: 1, perPage: 101 }),
    });
    expect(invalidPage.status).toBe(400);
    expect(await invalidPage.json()).toMatchObject({ code: 'INVALID_REQUEST' });
  });

  it('accepts the contract empty-object body for organization installations', async () => {
    const response = await fetch(`${baseUrl}/organizations/installations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'OK', value: [] });
  });

  it('routes snapshot reads through the content service with the GH-INTEROP request fields', async () => {
    const headers = { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' };
    const compare = await fetch(`${baseUrl}/repositories/compare`, {
      method: 'POST', headers,
      body: JSON.stringify({ installationId: '13', repositoryName: 'acme/widgets', baseSha: 'base-sha', headSha: 'head-sha' }),
    });
    expect(compare.status).toBe(200);
    expect(await compare.json()).toEqual({ status: 'OK', value: { files: [] } });
    expect(content.compare).toHaveBeenCalledWith('13', 'acme/widgets', 'base-sha', 'head-sha');

    const tree = await fetch(`${baseUrl}/repositories/tree`, {
      method: 'POST', headers,
      body: JSON.stringify({ installationId: '13', repositoryName: 'acme/widgets', commitSha: 'commit-sha' }),
    });
    expect(tree.status).toBe(200);
    expect(content.getTree).toHaveBeenCalledWith('13', 'acme/widgets', 'commit-sha');

    const batch = await fetch(`${baseUrl}/repositories/files:batch`, {
      method: 'POST', headers,
      body: JSON.stringify({ installationId: '13', repositoryName: 'acme/widgets', commitSha: 'commit-sha', paths: ['src/index.ts'] }),
    });
    expect(batch.status).toBe(200);
    expect(content.getFilesBatch).toHaveBeenCalledWith('13', 'acme/widgets', 'commit-sha', ['src/index.ts']);

    const head = await fetch(`${baseUrl}/repositories/pull-request-head`, {
      method: 'POST', headers,
      body: JSON.stringify({ installationId: '13', repositoryName: 'acme/widgets', pullRequestNumber: 42 }),
    });
    expect(head.status).toBe(200);
    expect(content.getPullRequestHead).toHaveBeenCalledWith('13', 'acme/widgets', 42);
  });

  it('rejects malformed snapshot DTOs, paths above the eight-file batch cap, and unknown fields', async () => {
    const headers = { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' };
    const tooManyPaths = await fetch(`${baseUrl}/repositories/files:batch`, {
      method: 'POST', headers,
      body: JSON.stringify({ installationId: '13', repositoryName: 'acme/widgets', commitSha: 'commit-sha', paths: Array(9).fill('src/index.ts') }),
    });
    expect(tooManyPaths.status).toBe(400);
    expect(await tooManyPaths.json()).toMatchObject({ code: 'INVALID_REQUEST' });

    const unsafePath = await fetch(`${baseUrl}/repositories/files:batch`, {
      method: 'POST', headers,
      body: JSON.stringify({ installationId: '13', repositoryName: 'acme/widgets', commitSha: 'commit-sha', paths: ['src/../secret'] }),
    });
    expect(unsafePath.status).toBe(400);

    const unexpected = await fetch(`${baseUrl}/repositories/tree`, {
      method: 'POST', headers,
      body: JSON.stringify({ installationId: '13', repositoryName: 'acme/widgets', commitSha: 'commit-sha', extra: true }),
    });
    expect(unexpected.status).toBe(400);
    expect(content.getFilesBatch).toHaveBeenCalledTimes(1);
  });

  it('normalizes unexpected failures without exposing provider tokens or exception text', async () => {
    const providerToken = 'do-not-log-this-provider-token';
    discovery.list.mockRejectedValueOnce(new Error(`upstream body included ${providerToken}`));
    const response = await fetch(`${baseUrl}/repositories/discovery`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceToken}`,
        'X-GitHub-Provider-Token': providerToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page: 1, perPage: 20 }),
    });
    const body = await response.json();
    expect(response.status).toBe(503);
    expect(body).toMatchObject({ code: 'GITHUB_UPSTREAM_UNAVAILABLE', retryable: true });
    expect(JSON.stringify(body)).not.toContain(providerToken);
  });
});
