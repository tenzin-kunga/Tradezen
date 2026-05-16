import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { runMigrations } from './db';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

// ── Environment Validation ────────────────────────────────────────────────────
// This function is temporarily disabled for development mode.
// Enable in production by uncommenting the call below.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _validateEnv() {
  const required = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'DB_PASSWORD'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 64) {
    throw new Error('JWT_SECRET must be at least 64 characters long');
  }

  if (
    !process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_REFRESH_SECRET.length < 64
  ) {
    throw new Error('JWT_REFRESH_SECRET must be at least 64 characters long');
  }
}

// Debug: Log environment state
console.log('DEBUG: NODE_ENV =', process.env.NODE_ENV);
console.log('DEBUG: JWT_SECRET exists =', !!process.env.JWT_SECRET);
console.log(
  'DEBUG: JWT_REFRESH_SECRET exists =',
  !!process.env.JWT_REFRESH_SECRET,
);

// Run validation in production (skip in dev for convenience)
// TEMPORARILY DISABLED FOR DEV MODE
// if (process.env.NODE_ENV === 'production') {
//   console.log('DEBUG: Running validation in production mode');
//   validateEnv();
// }

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ── CORS ────────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  // ── Middleware ──────────────────────────────────────────────────────────────
  app.use(cookieParser());

  // ── Global Pipes ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidUnknownValues: true,
      stopAtFirstError: true,
    }),
  );

  // ── Global Filters & Interceptors ──────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // ── Swagger / OpenAPI ───────────────────────────────────────────────────────
  // Disable in production to avoid exposing API structure
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('TradeZen API')
      .setDescription('Trading journal API — Carbon Ledger')
      .setVersion('2.4.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  // ── Static Assets ───────────────────────────────────────────────────────────
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // ── Database Migrations ─────────────────────────────────────────────────────
  await runMigrations();

  // ── Start Server ────────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(
    `🚀 TradeZen API running on port ${port} (NODE_ENV=${process.env.NODE_ENV || 'development'})`,
  );
}
bootstrap();
