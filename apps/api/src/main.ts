import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { EnvService } from './config/env.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const { NODE_ENV, PORT, CORS_ORIGIN } = app.get(EnvService).env;

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.use(cookieParser()); // REQUIRED: enables req.cookies for JwtStrategy extractor
  app.enableCors({
    origin: CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  if (NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('MedSchedule API')
      .setDescription('Medical scheduling system')
      .setVersion('0.2.0')
      .addCookieAuth('access_token')
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  }

  await app.listen(PORT);
  app.get(Logger).log(`API running on http://localhost:${PORT}`);
  if (NODE_ENV !== 'production') {
    app.get(Logger).log(`Swagger at http://localhost:${PORT}/api/docs`);
  }
}

bootstrap();
