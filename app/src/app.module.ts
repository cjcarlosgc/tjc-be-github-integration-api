import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/runtime-config.js';
import { GithubModule } from './github/github.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnvironment,
    }),
    GithubModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
