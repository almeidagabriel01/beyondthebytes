import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

const _env = validateEnv();

const pinoTransport =
  _env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined;

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: _env.NODE_ENV !== 'production' ? 'debug' : 'info',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.body.password',
            'req.body.passwordHash',
            'req.body.cpf',
          ],
          censor: '[REDACTED]',
        },
        ...(pinoTransport ? { transport: pinoTransport } : {}),
      },
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 100 },
    ]),
    PrismaModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
