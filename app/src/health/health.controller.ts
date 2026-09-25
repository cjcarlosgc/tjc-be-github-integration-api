import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { hasRequiredRuntimeConfiguration } from '../config/runtime-config.js';

type HealthStatus = 'ok' | 'not_ready';

export interface HealthResponse {
  status: HealthStatus;
  checks: {
    liveness: 'ok';
    readiness: HealthStatus;
  };
}

@Controller('health')
export class HealthController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  getHealth(@Res({ passthrough: true }) response: Response): HealthResponse {
    const ready = hasRequiredRuntimeConfiguration({
      CORE_TO_GITHUB_INTEGRATION_TOKEN: this.config.get<string>(
        'CORE_TO_GITHUB_INTEGRATION_TOKEN',
      ),
      GITHUB_APP_ID: this.config.get<string>('GITHUB_APP_ID'),
      GITHUB_APP_PRIVATE_KEY_BASE64: this.config.get<string>('GITHUB_APP_PRIVATE_KEY_BASE64'),
    });
    const status: HealthStatus = ready ? 'ok' : 'not_ready';

    response.status(ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return {
      status,
      checks: {
        liveness: 'ok',
        readiness: status,
      },
    };
  }
}
