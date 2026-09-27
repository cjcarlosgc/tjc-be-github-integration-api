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
import { GithubPublicationService } from './github-publication.service.js';
import { InternalErrorFilter } from './internal-error.filter.js';
import { correlationIdMiddleware } from '../correlation-id.middleware.js';
import { configureRequestBodyParsers } from '../request-body-parsers.js';

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
  getPullRequestHead: vi.fn().mockResolvedValue({
    status: 'OK', value: { headSha: 'head-sha', state: 'open', createdAt: '2026-09-25T12:00:00.000Z' },
  }),
};
const publication = {
  createCheck: vi.fn().mockResolvedValue(undefined),
  preflight: vi.fn().mockResolvedValue({ status: 'READY' }),
  uploadProposalBlob: vi.fn().mockResolvedValue({ status: 'UPLOADED', path: 'tests/new.spec.ts', blobSha: 'b'.repeat(40) }),
  finalize: vi.fn().mockResolvedValue({
    status: 'PUBLISHED', branchName: 'rag-tests/pr-42-aaaaaaa', commitSha: 'c'.repeat(40),
    pullRequest: { number: 51, url: 'https://github.com/acme/widgets/pull/51' },
  }),
};

@Module({
  controllers: [GithubIntegrationController],
  providers: [
    CoreServiceAuthGuard,
    { provide: ConfigService, useValue: { get: (key: string) => key === 'CORE_TO_GITHUB_INTEGRATION_TOKEN' ? serviceToken : undefined } },
    { provide: GithubAccessService, useValue: access },
    { provide: GithubRepositoryDiscoveryService, useValue: discovery },
    { provide: GithubRepositoryContentService, useValue: content },
    { provide: GithubPublicationService, useValue: publication },
    { provide: APP_FILTER, useClass: InternalErrorFilter },
  ],
})
class GithubControllerTestModule {}

describe('private GitHub integration routes', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create(GithubControllerTestModule, { logger: false, bodyParser: false });
    app.use(correlationIdMiddleware);
    configureRequestBodyParsers(app, serviceToken);
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
    expect(await head.json()).toEqual({
      status: 'OK', value: { headSha: 'head-sha', state: 'open', createdAt: '2026-09-25T12:00:00.000Z' },
    });
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

  it('routes Checks and the stateless companion-publication sequence with the contract DTOs', async () => {
    const headers = { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' };
    const sourceHeadSha = 'a'.repeat(40);
    const checkBody = {
      installationId: '13', repositoryName: 'acme/widgets', name: 'RAG validation', headSha: sourceHeadSha,
      conclusion: 'success', title: 'Passed', summary: 'Analysis complete.', detailsUrl: 'https://app.example/runs/1',
    };
    const check = await fetch(`${baseUrl}/checks`, { method: 'POST', headers, body: JSON.stringify(checkBody) });
    expect(check.status).toBe(204);
    expect(await check.text()).toBe('');
    expect(publication.createCheck).toHaveBeenCalledWith(checkBody);

    const request = { installationId: '13', repositoryName: 'acme/widgets', pullRequestNumber: 42, sourceHeadSha };
    const preflight = await fetch(`${baseUrl}/publications/companion-pull-request/preflight`, {
      method: 'POST', headers, body: JSON.stringify(request),
    });
    expect(preflight.status).toBe(200);
    expect(await preflight.json()).toEqual({ status: 'READY' });
    expect(publication.preflight).toHaveBeenCalledWith(request);

    const blobRequest = { ...request, path: 'tests/new.spec.ts', contentBase64: Buffer.from('test').toString('base64') };
    const blob = await fetch(`${baseUrl}/publications/companion-pull-request/proposal-blobs`, {
      method: 'POST', headers, body: JSON.stringify(blobRequest),
    });
    expect(await blob.json()).toEqual({ status: 'UPLOADED', path: 'tests/new.spec.ts', blobSha: 'b'.repeat(40) });
    expect(publication.uploadProposalBlob).toHaveBeenCalledWith(blobRequest);

    const finalizeRequest = {
      ...request, sourceHeadRef: 'feature/new-tests', analysisRunId: 'run-1',
      proposalFiles: [{ path: 'tests/new.spec.ts', blobSha: 'b'.repeat(40) }],
    };
    const finalized = await fetch(`${baseUrl}/publications/companion-pull-request`, {
      method: 'POST', headers, body: JSON.stringify(finalizeRequest),
    });
    expect(await finalized.json()).toEqual({
      status: 'PUBLISHED', branchName: 'rag-tests/pr-42-aaaaaaa', commitSha: 'c'.repeat(40),
      pullRequest: { number: 51, url: 'https://github.com/acme/widgets/pull/51' },
    });
    expect(publication.finalize).toHaveBeenCalledWith(finalizeRequest);
  });

  it('accepts large JSON only for authenticated proposal blobs, not finalization', async () => {
    const largeBlob = { installationId: '13', repositoryName: 'acme/widgets', pullRequestNumber: 42, sourceHeadSha: 'a'.repeat(40), path: 'tests/large.spec.ts', contentBase64: 'YQ=='.repeat(30_000) };
    const body = JSON.stringify(largeBlob);
    expect(Buffer.byteLength(body)).toBeGreaterThan(100_000);

    const accepted = await fetch(`${baseUrl}/publications/companion-pull-request/proposal-blobs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' },
      body,
    });
    expect(accepted.status).toBe(200);
    expect(publication.uploadProposalBlob).toHaveBeenCalledWith(largeBlob);

    const unauthorized = await fetch(`${baseUrl}/publications/companion-pull-request/proposal-blobs`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body,
    });
    expect(unauthorized.status).toBe(401);
    expect(await unauthorized.json()).toMatchObject({ code: 'SERVICE_UNAUTHORIZED', retryable: false });

    const oversizedFinalization = await fetch(`${baseUrl}/publications/companion-pull-request`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: 'a'.repeat(110_000) }),
    });
    expect(oversizedFinalization.status).toBe(413);
    expect(await oversizedFinalization.json()).toMatchObject({ code: 'INVALID_REQUEST' });
  });

  it('rejects invalid publication paths, check conclusions, and unexpected fields', async () => {
    const headers = { Authorization: `Bearer ${serviceToken}`, 'Content-Type': 'application/json' };
    const invalidCheck = await fetch(`${baseUrl}/checks`, {
      method: 'POST', headers,
      body: JSON.stringify({
        installationId: '13', repositoryName: 'acme/widgets', name: 'check', headSha: 'a'.repeat(40),
        conclusion: 'in_progress', title: 'title', summary: 'summary',
      }),
    });
    expect(invalidCheck.status).toBe(400);

    const invalidPath = await fetch(`${baseUrl}/publications/companion-pull-request/proposal-blobs`, {
      method: 'POST', headers,
      body: JSON.stringify({
        installationId: '13', repositoryName: 'acme/widgets', pullRequestNumber: 42,
        sourceHeadSha: 'a'.repeat(40), path: '../escape.ts', contentBase64: Buffer.from('test').toString('base64'),
      }),
    });
    expect(invalidPath.status).toBe(400);

    const extra = await fetch(`${baseUrl}/publications/companion-pull-request/preflight`, {
      method: 'POST', headers,
      body: JSON.stringify({ installationId: '13', repositoryName: 'acme/widgets', pullRequestNumber: 42, sourceHeadSha: 'a'.repeat(40), extra: true }),
    });
    expect(extra.status).toBe(400);
    expect(await extra.json()).toMatchObject({ code: 'INVALID_REQUEST' });
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
