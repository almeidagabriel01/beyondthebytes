import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { env } from './config/env';

async function bootstrap(): Promise<void> {
  const { NODE_ENV, PORT, CORS_ORIGIN } = env();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.enableCors({
    origin: CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  if (NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('MedSchedule API')
      .setDescription('Medical scheduling system — Phase 0 baseline')
      .setVersion('0.0.1')
      .addBearerAuth()
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
