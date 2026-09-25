import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { GithubIntegrationError, upstreamUnavailable } from './errors.js';
import type { CorrelatedRequest } from '../correlation-id.middleware.js';

@Catch()
export class InternalErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(InternalErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<CorrelatedRequest>();
    const response = http.getResponse<Response>();
    const correlationId = request.correlationId ?? randomUUID();
    response.setHeader('X-Correlation-ID', correlationId);

    let error: GithubIntegrationError;
    if (exception instanceof GithubIntegrationError) {
      error = exception;
    } else if (exception instanceof HttpException && exception.getStatus() === 400) {
      error = new GithubIntegrationError('INVALID_REQUEST', 'The request is invalid.', 400, false);
    } else if (exception instanceof HttpException && exception.getStatus() === 401) {
      error = new GithubIntegrationError('SERVICE_UNAUTHORIZED', 'A valid service bearer is required.', 401, false);
    } else if (exception instanceof HttpException && exception.getStatus() === 404) {
      error = new GithubIntegrationError('GITHUB_RESOURCE_NOT_FOUND', 'The requested resource was not found.', 404, false);
    } else {
      // Never log exception text, stack, request headers or upstream bodies.
      this.logger.warn(`Unhandled internal request failure (correlationId=${correlationId}).`);
      error = upstreamUnavailable();
    }

    response.status(error.status).json({
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      correlationId,
    });
  }
}
