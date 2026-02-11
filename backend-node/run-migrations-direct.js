const postgres = require('postgres');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  const sql = postgres(process.env.DATABASE_URL);

  try {
    console.log('✅ Connected to database');

    // Migration 3
    console.log('\n🔄 Running Migration 3...');
    const migration3 = fs.readFileSync(
      path.join(__dirname, 'drizzle', '0003_add_join_code_fields.sql'),
      'utf8'
    );
    await sql.unsafe(migration3);
    console.log('✅ Migration 3 completed');

    // Migration 4
    console.log('\n🔄 Running Migration 4...');
    const migration4 = fs.readFileSync(
      path.join(__dirname, 'drizzle', '0004_add_teams_join_codes_join_requests_notifications.sql'),
      'utf8'
    );
    // Execute each statement separately
    const statements = migration4
      .split('--> statement-breakpoint')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt) {
        try {
          await sql.unsafe(stmt);
          console.log(`  ✓ Statement ${i + 1}/${statements.length} executed`);
        } catch (err) {
          if (err.message.includes('already exists') || err.message.includes('duplicate')) {
            console.log(`  ⚠ Statement ${i + 1} skipped (already exists)`);
          } else {
            throw err;
          }
        }
      }
    }
    console.log('✅ Migration 4 completed');

    console.log('\n✅ All migrations completed successfully!');
    console.log('\nNew tables created:');
    console.log('  - teams');
    console.log('  - team_members');
    console.log('  - join_codes');
    console.log('  - join_requests');
    console.log('  - notifications');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    await sql.end();
  }
}

runMigrations()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Error:', err);
    process.exit(1);
  });

