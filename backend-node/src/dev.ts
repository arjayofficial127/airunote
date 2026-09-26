import path from 'path';
import * as dotenv from 'dotenv';

function loadDevelopmentEnvironment(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    throw new Error(
      `Development environment file not found at ${envPath}. Copy backend-node/.env.example to backend-node/.env and update it for your database.`
    );
  }

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error(`DATABASE_URL is required in ${envPath}`);
  }

  const target = new URL(databaseUrl);
  if (target.protocol !== 'postgres:' && target.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must use the postgres:// or postgresql:// protocol');
  }

  process.env.NODE_ENV ??= 'development';
}

async function isAirunoteAlreadyRunning(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/`, {
      signal: AbortSignal.timeout(1_000),
    });
    if (!response.ok) return false;

    const payload = await response.json() as { name?: string; status?: string };
    return payload.name === 'airunote API' && payload.status === 'running';
  } catch {
    return false;
  }
}

async function startDevelopmentServer(): Promise<void> {
  loadDevelopmentEnvironment();

  const port = Number(process.env.PORT) || Number(process.env.API_PORT) || 4000;
  if (await isAirunoteAlreadyRunning(port)) {
    console.info(`[Server] Airunote is already running on http://localhost:${port}. Reusing the existing development server.`);
    return;
  }

  await import('./index.js');
}

void startDevelopmentServer().catch((error) => {
  console.error('Failed to start the Airunote development server:', error);
  process.exitCode = 1;
});
