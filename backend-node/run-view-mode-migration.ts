/**
 * Run view_mode migration directly
 * This adds the view_mode column to airu_lens_items table
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import postgres from 'postgres';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function runViewModeMigration() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in .env');
    process.exit(1);
  }

  console.log('\n🔄 Running View Mode Migration (0012)...');

  const sql = postgres(connectionString);

  try {
    const migrationPath = path.join(__dirname, 'drizzle', '0012_add_lens_items_view_mode.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await sql.unsafe(migrationSQL);

    console.log('✅ View mode migration completed successfully!');
    console.log('   Added view_mode column to airu_lens_items table');
  } catch (error: any) {
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.log('✅ Migration already applied (column exists)');
    } else {
      console.error('\n❌ Migration failed:', error.message);
      process.exit(1);
    }
  } finally {
    await sql.end();
  }
}

runViewModeMigration();
