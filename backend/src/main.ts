import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // API versionada (spec §5.4): /api/v1/...
  app.setGlobalPrefix('api/v1', { exclude: ['/'] });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((s) => s.trim());
  app.enableCors({ origin: origins });

  // Archivos (escudos, galería): servidos desde FILES_DIR, rutas en DB (spec §5.5).
  const filesDir = process.env.FILES_DIR ?? './uploads';
  if (!existsSync(filesDir)) mkdirSync(filesDir, { recursive: true });
  app.useStaticAssets(join(process.cwd(), filesDir), { prefix: '/api/v1/files/' });

  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}
bootstrap();
