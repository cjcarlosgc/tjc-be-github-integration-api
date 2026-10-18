import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { correlationIdMiddleware } from './correlation-id.middleware.js';
import { configureConsoleCors } from './console-cors.js';
import { registerProcessSafetyNets } from './process-safety.js';
import { configureRequestBodyParsers } from './request-body-parsers.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);
  const port = config.get<number>('PORT') ?? 3000;
  configureConsoleCors(
    app,
    config.get<string>('CONSOLE_CORS_ORIGINS'),
    config.get<string>('NODE_ENV') !== 'production',
  );

  app.use(correlationIdMiddleware);
  configureRequestBodyParsers(app, config.get<string>('CORE_TO_GITHUB_INTEGRATION_TOKEN') ?? '');
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transformOptions: { enableImplicitConversion: false },
  }));

  app.enableShutdownHooks();
  registerProcessSafetyNets(new Logger('Process'), async (exitCode) => {
    await app.close().catch(() => undefined);
    process.exit(exitCode);
  });
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
