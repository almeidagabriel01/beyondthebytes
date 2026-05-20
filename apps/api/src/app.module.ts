import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

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
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // ORDER MATTERS: ThrottlerGuard checks rate limits BEFORE auth
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
