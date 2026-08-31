ALTER TABLE "exams"
  ADD COLUMN IF NOT EXISTS "archived_at" timestamp,
  ADD COLUMN IF NOT EXISTS "archived_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "exam_attempts"
  ADD COLUMN IF NOT EXISTS "ended_at" timestamp,
  ADD COLUMN IF NOT EXISTS "is_preview" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "previewed_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "previewed_by_email" varchar(255),
  ADD COLUMN IF NOT EXISTS "previewed_by_role" varchar(80),
  ADD COLUMN IF NOT EXISTS "voided_at" timestamp,
  ADD COLUMN IF NOT EXISTS "voided_by_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "void_reason" text;

ALTER TABLE "exam_attempts" DROP CONSTRAINT IF EXISTS "exam_attempts_status_check";
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_status_check"
  CHECK ("status" IN ('in_progress', 'completed', 'terminated', 'timed_out', 'abandoned', 'void'));

UPDATE "exam_attempts"
SET "ended_at" = "completed_at"
WHERE "ended_at" IS NULL AND "completed_at" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "exams_org_archived_idx" ON "exams" ("org_id", "archived_at");
CREATE INDEX IF NOT EXISTS "exam_attempts_reporting_idx" ON "exam_attempts" ("exam_id", "is_preview", "status");
