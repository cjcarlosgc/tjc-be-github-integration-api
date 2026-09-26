import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { parseConsoleCorsOrigins } from './config/runtime-config.js';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { correlationIdMiddleware } from './correlation-id.middleware.js';
import { configureRequestBodyParsers } from './request-body-parsers.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3000;
  const consoleOrigins = parseConsoleCorsOrigins(
    config.get<string>('CONSOLE_CORS_ORIGINS'),
    config.get<string>('NODE_ENV') !== 'production',
  ) ?? [];

  app.use(correlationIdMiddleware);
  app.enableCors({
    origin: (origin, callback) => callback(null, origin === undefined || consoleOrigins.includes(origin)),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Accept', 'Authorization', 'Content-Type', 'X-Correlation-ID', 'X-GitHub-Provider-Token'],
    exposedHeaders: ['X-Correlation-ID'],
    credentials: false,
    maxAge: 600,
  });
  configureRequestBodyParsers(app, config.get<string>('CORE_TO_GITHUB_INTEGRATION_TOKEN') ?? '');
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transformOptions: { enableImplicitConversion: false },
  }));

  app.enableShutdownHooks();
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
