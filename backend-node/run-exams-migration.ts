import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

const expectedTables = [
  'exam_org_settings',
  'exams',
  'exam_sections',
  'exam_questions',
  'exam_question_options',
  'exam_attempts',
  'exam_answers',
  'exam_attempt_events',
];

function loadCommentedNeonUrl(): string {
  const envPath = path.resolve(__dirname, '.env');
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*#.*\bDATABASE_URL=(.+)\s*$/);
    if (!match?.[1]) continue;
    const value = match[1].trim().replace(/^['"]|['"]$/g, '');
    const parsed = new URL(value);
    if (parsed.hostname.endsWith('.neon.tech')) return value;
  }
  throw new Error('A commented Neon DATABASE_URL profile was not found');
}

async function main(): Promise<void> {
  if (!process.argv.includes('--use-commented-neon')) {
    throw new Error('Refusing to run without --use-commented-neon');
  }
  const connectionString = loadCommentedNeonUrl();
  const target = new URL(connectionString);
  if (!target.hostname.endsWith('.neon.tech')) throw new Error('Refusing non-Neon migration target');

  const migrationPaths = [
    path.resolve(__dirname, 'drizzle', '0025_add_resident_exams.sql'),
    path.resolve(__dirname, 'drizzle', '0026_defer_exam_answer_question_constraint.sql'),
    path.resolve(__dirname, 'drizzle', '0027_custom_exam_public_ids.sql'),
  ];
  const sql = postgres(connectionString, { max: 1, prepare: false, connect_timeout: 30 });
  try {
    console.log(`[Exams migration] Target verified: ${target.hostname}`);
    await sql.begin(async (transaction) => {
      for (const migrationPath of migrationPaths) {
        await transaction.unsafe(fs.readFileSync(migrationPath, 'utf8'));
      }
    });
    const rows = await sql<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ANY(${expectedTables})
      ORDER BY table_name
    `;
    const present = new Set(rows.map((row) => row.table_name));
    const missing = expectedTables.filter((table) => !present.has(table));
    if (missing.length > 0) throw new Error(`Migration verification failed; missing: ${missing.join(', ')}`);
    const [publicIdColumn] = await sql<{ data_type: string; character_maximum_length: number | null }[]>`
      SELECT data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'exams' AND column_name = 'public_id'
    `;
    if (publicIdColumn?.data_type !== 'character varying' || publicIdColumn.character_maximum_length !== 80) {
      throw new Error('Migration verification failed; exams.public_id is not varchar(80)');
    }
    console.log(`[Exams migration] Verified ${rows.length} resident exam tables.`);
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error('[Exams migration] Failed:', error instanceof Error ? error.message : 'Unknown error');
  process.exit(1);
});
