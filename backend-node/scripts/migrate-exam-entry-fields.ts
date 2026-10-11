import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

// Require an explicit target; do not infer production from a local env file.
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL for the intended database.');
  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  try {
    await sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(31332026)`;
      await tx.unsafe(fs.readFileSync(path.resolve(__dirname, '../drizzle/0033_exam_entry_fields.sql'), 'utf8'));
    });
    console.log('Entry-field migration applied.');
  } finally { await sql.end(); }
}
main().catch(() => { console.error('Entry-field migration failed; check the configured database and prerequisites.'); process.exitCode = 1; });
