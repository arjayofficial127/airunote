import postgres from 'postgres';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL explicitly.');
  const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
  try {
    await sql.begin(async tx => {
      const examId = 'adb5d69d-2e9f-4bf9-b72c-4f116828f0f8';
      const rows = await tx`UPDATE exam_questions SET entry_field=true, graded=false, points=0, max_time_seconds=null, updated_at=now()
        WHERE exam_id=${examId} AND id IN ('01595322-2831-4e26-b7f8-2d29b60506e6','351d0351-eab5-4e9b-91f6-0a2441636b4b') AND graded=false RETURNING id`;
      if (rows.length !== 2) throw new Error('Expected the two ungraded partner fields.');
      await tx`UPDATE exams SET description=replace(description,
        'Enter your full name and Partner Number in the identity fields. Enter your exam date and PC on Duty in the ungraded Partner details section.',
        'Enter your Full Name, Partner Number, and PC on Duty below. The date and time are recorded automatically when you start.'), updated_at=now() WHERE id=${examId}`;
    });
    console.log('Partner fields moved; existing answers preserved.');
  } finally { await sql.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode=1; });
