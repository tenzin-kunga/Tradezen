import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cron from 'node-cron';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { SnapshotService } from './analytics/snapshot.service';
import { runMigrations } from './db';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TimingInterceptor } from './common/interceptors/timing.interceptor';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter, createContext } from './trpc';

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

// Run validation in production (skip in dev for convenience)
// TEMPORARILY DISABLED FOR DEV MODE
// if (process.env.NODE_ENV === 'production') {
//   validateEnv();
// }

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // ── CORS ────────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  // ── Security Headers (Helmet) ───────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: [
            "'self'",
            process.env.WEB_URL ?? 'http://localhost:3000',
          ],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests:
            process.env.NODE_ENV === 'production' ? [] : null,
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

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
  app.useGlobalInterceptors(new TimingInterceptor());

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

  // ── tRPC Endpoint ───────────────────────────────────────────────────────────
  app.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  // ── Database Migrations ─────────────────────────────────────────────────────
  await runMigrations();

  // ── Nightly Analytics Snapshots ─────────────────────────────────────────────
  const snapshotService = app.get(SnapshotService);
  cron.schedule('0 23 * * *', async () => {
    console.log('Running nightly analytics snapshots...');
    await snapshotService.createAllSnapshots();
    console.log('Nightly analytics snapshots completed');
  });

  // ── Start Server ────────────────────────────────────────────────────────────
  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  console.log(
    `🚀 TradeZen API running on port ${port} (NODE_ENV=${process.env.NODE_ENV || 'development'})`,
  );
}
bootstrap();
