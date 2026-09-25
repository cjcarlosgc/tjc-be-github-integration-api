import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import { GithubIntegrationError } from './errors.js';

@Injectable()
export class CoreServiceAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const authorization = request.headers.authorization;
    const expected = this.config.get<string>('CORE_TO_GITHUB_INTEGRATION_TOKEN');
    const match = typeof authorization === 'string' ? /^Bearer ([^\s]+)$/.exec(authorization) : null;
    const actualBuffer = match ? Buffer.from(match[1]) : Buffer.alloc(0);
    const expectedBuffer = expected ? Buffer.from(expected) : Buffer.alloc(0);
    const valid = actualBuffer.length > 0 && actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
    if (!valid) {
      throw new GithubIntegrationError('SERVICE_UNAUTHORIZED', 'A valid service bearer is required.', 401, false);
    }
    return true;
  }
}
