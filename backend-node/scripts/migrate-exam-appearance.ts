import fs from 'fs';
import path from 'path';
import postgres from 'postgres';
import dotenv from 'dotenv';
import { legacyAppearance } from '../src/modules/exam-appearance/contract';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export async function migrateAppearance(connection: string) {
  const target = new URL(connection);
  const sql = postgres(connection, { max: 1, prepare: false });
  try {
    console.log(
      `Appearance migration target: ${target.hostname}:${target.port || '5432'}${target.pathname}`
    );
    return await sql.begin(async (tx) => {
      await tx`SELECT pg_advisory_xact_lock(30302026)`;
      for (const table of ['exams', 'exam_attempts', 'exam_org_settings', 'org_files']) {
        const [row] = await tx`SELECT to_regclass(${`public.${table}`}) AS name`;
        if (!row.name)
          throw new Error(
            `Missing prerequisite table ${table}. Apply the existing application migrations first.`
          );
      }
      await tx.unsafe(
        fs.readFileSync(
          path.resolve(__dirname, '../drizzle/0030_exam_appearance_and_native_files.sql'),
          'utf8'
        )
      );
      // The config is frozen as a migration fixture, rather than changing when defaults evolve.
      const config = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, '../drizzle/0030_legacy_appearance.json'), 'utf8')
      ) as typeof legacyAppearance;
      const missing = await tx`SELECT DISTINCT org_id FROM exams WHERE appearance_config IS NULL`;
      for (const org of missing) {
        const [template] =
          await tx`INSERT INTO exam_templates (org_id,name,config,legacy_key) VALUES (${org.org_id},'Autumn · existing exams',${tx.json(config)},'autumn-v1') ON CONFLICT (org_id,legacy_key) DO UPDATE SET legacy_key=EXCLUDED.legacy_key RETURNING id`;
        await tx`UPDATE exams SET appearance_config=${tx.json(config)}, appearance_template_id=${template.id}, appearance_revision=1 WHERE org_id=${org.org_id} AND appearance_config IS NULL`;
        await tx`INSERT INTO exam_org_settings (org_id,default_exam_template_id) VALUES (${org.org_id},${template.id}) ON CONFLICT (org_id) DO UPDATE SET default_exam_template_id=COALESCE(exam_org_settings.default_exam_template_id,EXCLUDED.default_exam_template_id)`;
      }
      await tx`UPDATE exam_attempts SET appearance_config=${tx.json(config)} WHERE appearance_config IS NULL`;
      const [counts] =
        await tx`SELECT (SELECT count(*) FROM exams WHERE appearance_config IS NULL) AS missing_exams, (SELECT count(*) FROM exam_attempts WHERE appearance_config IS NULL) AS missing_attempts`;
      if (Number(counts.missing_exams) || Number(counts.missing_attempts))
        throw new Error('Backfill verification failed');
      console.log(`Appearance backfill verified for ${missing.length} organization(s).`);
    });
  } finally {
    await sql.end();
  }
}
if (require.main === module) {
  const connection = process.env.DATABASE_URL;
  if (!connection)
    throw new Error('Set DATABASE_URL explicitly. No production connection is inferred.');
  migrateAppearance(connection).catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
}
