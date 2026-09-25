import { json, raw, urlencoded } from 'express';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { isValidCoreServiceBearer } from './core-service-token.js';
import type { CorrelatedRequest } from './correlation-id.middleware.js';

const largeJsonRoutes = [
  '/internal/v1/github/publications/companion-pull-request/proposal-blobs',
  '/internal/v1/github/publications/companion-pull-request',
];
const githubWebhookRoute = '/integrations/github/webhooks';
const githubWebhookBodyLimit = '25mb';
const coreRequestJsonLimit = '136mb';
const defaultJsonLimit = '100kb';

export function configureRequestBodyParsers(app: NestExpressApplication, coreServiceToken: string): void {
  const server = app.getHttpAdapter().getInstance();

  server.post(
    githubWebhookRoute,
    (request, _response, next) => {
      (request as Request & { webhookReceivedAt?: Date }).webhookReceivedAt = new Date();
      next();
    },
    withNormalizedParserErrors(raw({ type: () => true, limit: githubWebhookBodyLimit, inflate: false })),
  );

  for (const route of largeJsonRoutes) {
    server.post(
      route,
      (request, response, next) => {
        const authorization = request.headers.authorization;
        if (isValidCoreServiceBearer(authorization, coreServiceToken)) {
          next();
          return;
        }
        writeRequestError(request, response, 401, 'SERVICE_UNAUTHORIZED', 'A valid service bearer is required.', false);
      },
      withNormalizedParserErrors(json({ limit: coreRequestJsonLimit })),
    );
  }

  server.use(withNormalizedParserErrors(json({ limit: defaultJsonLimit })));
  server.use(withNormalizedParserErrors(urlencoded({ extended: true, limit: defaultJsonLimit })));
}

function withNormalizedParserErrors(parser: (request: Request, response: Response, next: NextFunction) => void) {
  return (request: Request, response: Response, next: NextFunction): void => {
    parser(request, response, (error?: unknown) => {
      if (error) {
        const status = isPayloadTooLarge(error) ? 413 : 400;
        writeRequestError(request, response, status, 'INVALID_REQUEST', 'The request is invalid.', false);
        return;
      }
      next();
    });
  };
}

function isPayloadTooLarge(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'status' in error && error.status === 413;
}

function writeRequestError(
  request: Request,
  response: Response,
  status: 400 | 401 | 413,
  code: 'INVALID_REQUEST' | 'SERVICE_UNAUTHORIZED',
  message: string,
  retryable: false,
): void {
  const correlationId = (request as CorrelatedRequest).correlationId ?? randomUUID();
  response.setHeader('X-Correlation-ID', correlationId);
  response.status(status).json({ code, message, retryable, correlationId });
}
