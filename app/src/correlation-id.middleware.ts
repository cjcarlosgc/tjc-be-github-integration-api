import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const correlationIdStorage = new AsyncLocalStorage<string>();

export interface CorrelatedRequest extends Request {
  correlationId?: string;
}

export function correlationIdMiddleware(request: CorrelatedRequest, response: Response, next: NextFunction): void {
  const incoming = request.header('X-Correlation-ID');
  const correlationId = incoming && /^[a-zA-Z0-9._:-]{1,128}$/.test(incoming) ? incoming : randomUUID();
  request.correlationId = correlationId;
  response.setHeader('X-Correlation-ID', correlationId);
  correlationIdStorage.run(correlationId, next);
}
