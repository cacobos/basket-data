import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import type { Express } from 'express';
import express, { type Request, type Response } from 'express';
import 'reflect-metadata';
import { AppModule } from '../src/app.module';

let cachedServer: Express | null = null;

async function bootstrapServer(): Promise<Express> {
  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );

  const defaultOrigins = [
    'http://localhost:4200',
    'https://basket-data.vercel.app',
  ];
  const envOrigins = (process.env.FRONTEND_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const allowedOrigins = Array.from(
    new Set([...defaultOrigins, ...envOrigins]),
  );

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin no permitido por CORS: ${origin}`), false);
    },
    credentials: true,
  });

  await app.init();
  return expressApp;
}

export default async function handler(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    if (!cachedServer) {
      cachedServer = await bootstrapServer();
    }

    cachedServer(req, res);
  } catch (error) {
    console.error('[api] bootstrap error', error);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'bootstrap_failed',
        message: error instanceof Error ? error.message : 'unknown_error',
      });
      return;
    }

    throw error;
  }
}
