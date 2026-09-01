import 'reflect-metadata';
import * as dns from 'dns';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { sanitizeRequestBody } from './common/security/sanitize-request-body.middleware';

dns.setDefaultResultOrder('ipv4first'); // prefer IPv4 app-wide — avoids ECONNREFUSED on networks with broken IPv6 routing

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.set('trust proxy', 1);

  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const allowedOrigins = (config.get<string>('CORS_ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  });

  app.use(sanitizeRequestBody);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  if (config.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Segbaji & Son API')
      .setDescription('Backend API for the Segbaji & Son website and admin portal')
      .setVersion('0.1')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get<number>('PORT') ?? 4000;
  await app.listen(port);
  logger.log(`Segbaji & Son API running on http://localhost:${port}`);
  logger.log(`Health check: http://localhost:${port}/health`);
  if (config.get<string>('NODE_ENV') !== 'production') {
    logger.log(`API docs: http://localhost:${port}/api/docs`);
  }
}

bootstrap();