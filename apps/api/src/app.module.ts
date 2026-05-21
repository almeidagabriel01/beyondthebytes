import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { EnvModule, EnvService } from './config/env.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { CsrfOriginGuard } from './common/guards/csrf-origin.guard';
import { PatientsModule } from './modules/patients/patients.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { NotesModule } from './modules/notes/notes.module';

@Module({
  imports: [
    EnvModule,
    LoggerModule.forRootAsync({
      inject: [EnvService],
      useFactory: ({ env }: EnvService) => ({
        pinoHttp: {
          level: env.NODE_ENV !== 'production' ? 'debug' : 'info',
          redact: {
            paths: [
              'req.headers.authorization',
              'req.body.password',
              'req.body.passwordHash',
              'req.body.cpf',
              'req.body.phone',
              'req.body.email',
              'res.body.cpf',
              'res.body.phone',
              'res.body.*.cpf',
              'res.body.*.phone',
              'res.body.items[*].cpf',
              'res.body.items[*].phone',
              'res.body[*].patient.cpf',
              'res.body[*].patient.phone',
              'res.body.patient.cpf',
              'res.body.patient.phone',
            ],
            censor: '[REDACTED]',
          },
          ...(env.NODE_ENV !== 'production'
            ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
            : {}),
        },
      }),
    }),
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    PatientsModule,
    AppointmentsModule,
    DashboardModule,
    NotesModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    // ORDER MATTERS:
    //  1. ThrottlerGuard — rate-limit first (cheapest gate)
    //  2. CsrfOriginGuard — reject bad-origin requests before JWT work
    //  3. JwtAuthGuard — authenticate
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: CsrfOriginGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
