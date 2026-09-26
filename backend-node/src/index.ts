/**
 * airunote Backend Engine
 * Author: Arvin Jayson Tamayo Castro
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { createApp } from './api/server';
import { ILogger } from './core/logger/Logger';
import { container } from './core/di/container';
import { warmupDatabase } from './infrastructure/db/drizzle/client';

// Author signature constant (non-invasive identity seal)
export const AUTHOR_SIGNATURE = {
  name: "Arvin Jayson Tamayo Castro",
  base64: "QXJ2aW4gSmF5c29uIFRhbWF5byBDYXN0cm8=",
  hex: "417276696e204a6179736f6e2054616d61796f2043617374726f",
};

dotenv.config();

const PORT = Number(process.env.PORT) || Number(process.env.API_PORT) || 4000;

async function start() {
  const app = createApp();
  const logger = container.resolve<ILogger>('ILogger');

  // Warmup database on server start
  warmupDatabase().then(() => {
    logger.info('[Warmup] Database connection pool ready');
  }).catch((error) => {
    logger.warn('[Warmup] Database warmup failed (will retry on first query):', error);
  });

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(PORT, () => {
      server.off('error', reject);
      logger.info(`Server running on http://localhost:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      resolve();
    });

    server.once('error', reject);
  });
}

start().catch((error) => {
  if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
    console.error(`[Server] Port ${PORT} is already in use.`);
    console.error('[Server] If Airunote is already running, keep that terminal open and do not start a second copy.');
    console.error(`[Server] Otherwise stop the process using port ${PORT}, or change API_PORT in backend-node/.env.`);
    process.exit(1);
  }

  console.error('Failed to start server:', error);
  process.exit(1);
});

