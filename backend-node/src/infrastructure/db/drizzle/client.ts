/**
 * Drizzle database client
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env file from backend-node directory
// Try current directory first, then parent (for monorepo)
const envPath = path.resolve(process.cwd(), '.env');
const parentEnvPath = path.resolve(process.cwd(), '..', '.env');
if (require('fs').existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (require('fs').existsSync(parentEnvPath)) {
  dotenv.config({ path: parentEnvPath });
} else {
  // Fallback to default dotenv behavior
  dotenv.config();
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    `DATABASE_URL environment variable is required. Tried loading from: ${envPath}`
  );
}

const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString, {
  max: 20,                    // Increase pool size for better warmup
  connect_timeout: 30,
  idle_timeout: 20,
  max_lifetime: 60 * 30,      // 30 minutes
  // Neon-specific optimizations
  prepare: false,             // Disable prepared statements for Neon (better compatibility)
});

// Warmup function - call on server start
export async function warmupDatabase() {
  try {
    await client`SELECT 1`;
    console.log('[DB] Connection pool warmed up');
    return true;
  } catch (error) {
    console.error('[DB] Warmup failed:', error);
    return false;
  }
}

// Auto-warmup on module load (for serverless, this runs on cold start)
// Check if we're in Node.js environment (not browser)
if (typeof process !== 'undefined' && process.versions && process.versions.node) {
  warmupDatabase().catch(() => {
    // Silently fail - will retry on first query
  });
}

export const db = drizzle(client, { schema });

