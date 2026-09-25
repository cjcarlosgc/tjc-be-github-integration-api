import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GithubIntegrationError } from './errors.js';
import { isValidCoreServiceBearer } from '../core-service-token.js';

@Injectable()
export class CoreServiceAuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const authorization = request.headers.authorization;
    const expected = this.config.get<string>('CORE_TO_GITHUB_INTEGRATION_TOKEN');
    if (!isValidCoreServiceBearer(authorization, expected)) {
      throw new GithubIntegrationError('SERVICE_UNAUTHORIZED', 'A valid service bearer is required.', 401, false);
    }
    return true;
  }
}
