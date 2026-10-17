import type { INestApplication } from '@nestjs/common';
import { parseConsoleCorsOrigins } from './config/runtime-config.js';

type CorsOrigin = boolean | string | RegExp | Array<string | RegExp>;
type CorsOriginCallback = (error: Error | null, origin?: CorsOrigin) => void;

export function configureConsoleCors(
  app: Pick<INestApplication, 'enableCors'>,
  configuredOrigins: string | undefined,
  allowHttpLoopback = true,
): void {
  const consoleOrigins = parseConsoleCorsOrigins(configuredOrigins, allowHttpLoopback) ?? [];

  app.enableCors({
    origin: (origin: string | undefined, callback: CorsOriginCallback) =>
      callback(null, origin === undefined || consoleOrigins.includes(origin)),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Accept', 'Authorization', 'Content-Type', 'X-Correlation-ID', 'X-GitHub-Provider-Token'],
    exposedHeaders: ['X-Correlation-ID'],
    credentials: false,
    maxAge: 600,
  });
}
