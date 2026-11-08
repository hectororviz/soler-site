import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { isAbsolute, resolve } from 'path';
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
  // FILES_DIR puede ser absoluta (/app/uploads en prod) o relativa (./uploads en dev).
  const filesDir = process.env.FILES_DIR ?? './uploads';
  if (!existsSync(filesDir)) mkdirSync(filesDir, { recursive: true });
  const staticRoot = isAbsolute(filesDir) ? filesDir : resolve(process.cwd(), filesDir);
  // Compat: la DB histórica guarda `/files/...`, el contrato versionado usa `/api/v1/files/...`.
  app.useStaticAssets(staticRoot, { prefix: '/files/' });
  app.useStaticAssets(staticRoot, { prefix: '/api/v1/files/' });

  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}
bootstrap();
