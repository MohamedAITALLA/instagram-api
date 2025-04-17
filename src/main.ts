import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true, // Enable body parsing
  });

  // Set global prefix for all routes
  app.setGlobalPrefix('');

  // Enable validation
  app.useGlobalPipes(new ValidationPipe());

  // Configure CORS
  app.enableCors();

  // Check if running in Vercel
  const isVercel = process.env.VERCEL === '1';
  
  // Serve static files only in local development
  if (!isVercel) {
    app.use('/profile-images', express.static(join(process.cwd(), 'uploads', 'profile-images')));
    app.use('/instagram-media', express.static(join(process.cwd(), 'uploads', 'instagram-media')));

  }

  // Configure Swagger
  const config = new DocumentBuilder()
    .setTitle('Property API')
    .setDescription('API for managing properties')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
bootstrap();
