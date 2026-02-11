/**
 * Database migration script
 * Run with: pnpm db:migrate
 */
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './client';
import * as dotenv from 'dotenv';

// Load .env from backend-node directory (where script is run from)
dotenv.config({ path: '.env' });

async function runMigrations() {
  console.log('Running migrations...');
  
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();

