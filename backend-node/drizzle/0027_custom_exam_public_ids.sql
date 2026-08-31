ALTER TABLE "exams"
  ALTER COLUMN "public_id" DROP DEFAULT;

ALTER TABLE "exams"
  ALTER COLUMN "public_id" TYPE varchar(80)
  USING "public_id"::text;

ALTER TABLE "exams"
  ALTER COLUMN "public_id" SET DEFAULT gen_random_uuid()::text;

ALTER TABLE "exams"
  DROP CONSTRAINT IF EXISTS "exams_public_id_format_check";

ALTER TABLE "exams"
  ADD CONSTRAINT "exams_public_id_format_check"
  CHECK (
    char_length("public_id") BETWEEN 3 AND 80
    AND "public_id" ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'
  );
