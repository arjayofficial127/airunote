/**
 * Direct SQL migration runner for migrations 3 and 4
 */
const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL);

  try {
    console.log('🔄 Running Migration 3: Add join code fields...');
    const migration3 = fs.readFileSync(
      path.join(__dirname, 'drizzle', '0003_add_join_code_fields.sql'),
      'utf8'
    );
    await sql.unsafe(migration3);
    console.log('✅ Migration 3 completed');

    console.log('🔄 Running Migration 4: Add teams, join codes, join requests, notifications...');
    const migration4 = fs.readFileSync(
      path.join(__dirname, 'drizzle', '0004_add_teams_join_codes_join_requests_notifications.sql'),
      'utf8'
    );
    // Split by statement-breakpoint and execute each statement
    const statements = migration4.split('--> statement-breakpoint').filter(s => s.trim());
    for (const statement of statements) {
      const cleaned = statement.trim();
      if (cleaned) {
        await sql.unsafe(cleaned);
      }
    }
    console.log('✅ Migration 4 completed');

    console.log('✅ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('⚠️  Some objects may already exist - this is OK');
    } else {
      throw error;
    }
  } finally {
    await sql.end();
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

