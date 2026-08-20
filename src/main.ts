import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips any field not declared in the DTO
      forbidNonWhitelisted: true, // rejects the request instead of silently dropping extra fields
      transform: true, // lets @Type()/implicit conversions work
    }),
  );

  // Swagger — only mounted outside production. Nobody outside the team
  // should be able to browse the full endpoint list once this is live.
  if (config.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Segbaji & Son API')
      .setDescription('Backend API for the Segbaji & Son website and admin portal')
      .setVersion('0.1')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token', // must match the string passed to every @ApiBearerAuth() in controllers
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