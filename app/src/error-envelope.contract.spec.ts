import { ArgumentsHost, BadRequestException, ForbiddenException, HttpException, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { validateContract } from './contracts/contract-validator.js';
import { InternalErrorFilter } from './github/internal-error.filter.js';
import { GithubIntegrationError, upstreamUnavailable } from './github/errors.js';
import { configureRequestBodyParsers } from './request-body-parsers.js';

/** Contrato del error envelope (INTEROP-2.18 §4, GH-INTEROP-1.8, schemas/error-envelope.schema.json). */
const envelope = (body: unknown) => validateContract('error-envelope.schema.json', null, body);

function runFilter(exception: unknown, originalUrl = '/internal/v1/github/checks?installationId=1&secret=abc') {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ correlationId: 'corr-gh', originalUrl }),
      getResponse: () => ({ setHeader: vi.fn(), status }),
    }),
  } as unknown as ArgumentsHost;
  new InternalErrorFilter().catch(exception, host);
  return { status: status.mock.calls[0][0] as number, body: json.mock.calls[0][0] as Record<string, unknown> };
}

describe('InternalErrorFilter cumple el ErrorEnvelope canónico', () => {
  it.each([
    ['error propio no reintentable', new GithubIntegrationError('GITHUB_CHECK_IDENTITY_AMBIGUOUS', 'ambiguo', 409, false), 409, false],
    ['error propio reintentable', upstreamUnavailable(), 503, true],
    ['HttpException 400', new BadRequestException('x'), 400, false],
    ['error desconocido', new Error('detalle interno que no debe filtrarse'), 503, true],
  ])('%s', (_name, exception, expectedStatus, retryable) => {
    const { status, body } = runFilter(exception);
    const check = envelope(body);
    expect(check.errors).toEqual([]);
    expect(status).toBe(expectedStatus);
    expect(body).toMatchObject({ statusCode: expectedStatus, retryable, correlationId: 'corr-gh', details: null });
  });

  it.each([
    ['405 del framework', new HttpException('Method Not Allowed', 405), 400],
    ['415 del framework', new HttpException('Unsupported Media Type', 415), 400],
    ['413 payload demasiado grande', new HttpException('Payload Too Large', 413), 413],
  ])('un 4xx no previsto (%s) es un error del cliente no reintentable, no una falla de GitHub', (_name, exception, expectedStatus) => {
    const { status, body } = runFilter(exception);
    expect(status).toBe(expectedStatus);
    expect(body).toMatchObject({ code: 'INVALID_REQUEST', retryable: false });
    expect(envelope(body).errors).toEqual([]);
  });

  it('emite solo la ruta, sin query string, y nunca el texto del error original', () => {
    const { body } = runFilter(new Error('token=ghs_secreto'));
    expect(body.path).toBe('/internal/v1/github/checks');
    expect(JSON.stringify(body)).not.toContain('ghs_secreto');
    expect(JSON.stringify(body)).not.toContain('secret=abc');
  });

  it('una HttpException sin mapeo propio no filtra su mensaje', () => {
    const { body } = runFilter(new ForbiddenException('mensaje interno'));
    expect(JSON.stringify(body)).not.toContain('mensaje interno');
    expect(envelope(body).valid).toBe(true);
  });
});

describe('request-body-parsers cumple el ErrorEnvelope canónico', () => {
  @Module({})
  class EmptyModule {}
  let app: NestExpressApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(EmptyModule, { logger: false });
    configureRequestBodyParsers(app, 'service-token');
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });
  afterAll(async () => app.close());

  it('JSON mal formado → 400', async () => {
    const response = await fetch(`${baseUrl}/cualquier-ruta`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"roto":' });
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(envelope(body).errors).toEqual([]);
    expect(body).toMatchObject({ statusCode: 400, code: 'INVALID_REQUEST', retryable: false });
  });

  it('cuerpo mayor al límite → 413', async () => {
    const response = await fetch(`${baseUrl}/cualquier-ruta`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ x: 'a'.repeat(200_000) }) });
    const body = await response.json();
    expect(response.status).toBe(413);
    expect(envelope(body).errors).toEqual([]);
    expect(body).toMatchObject({ statusCode: 413, retryable: false });
  });

  it('ruta de blobs grandes sin bearer de servicio → 401', async () => {
    const response = await fetch(`${baseUrl}/internal/v1/github/publications/companion-pull-request/proposal-blobs?x=1`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(envelope(body).errors).toEqual([]);
    expect(body.code).toBe('SERVICE_UNAUTHORIZED');
    expect(body.path).toBe('/internal/v1/github/publications/companion-pull-request/proposal-blobs');
  });
});
