DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'pending_user_status'
  ) THEN
    CREATE TYPE "pending_user_status" AS ENUM (
      'email_sent',
      'verified',
      'completed',
      'expired',
      'locked',
      'superseded'
    );
  END IF;
END $$;

ALTER TABLE "pending_users"
  ADD COLUMN IF NOT EXISTS "registration_session_id" UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "status" "pending_user_status" DEFAULT 'email_sent',
  ADD COLUMN IF NOT EXISTS "token_version" INTEGER NOT NULL DEFAULT 1;

UPDATE "pending_users"
SET
  "registration_session_id" = COALESCE("registration_session_id", gen_random_uuid()),
  "status" = CASE
    WHEN "completed_at" IS NOT NULL THEN 'completed'::pending_user_status
    WHEN "verified_at" IS NOT NULL THEN 'verified'::pending_user_status
    ELSE 'email_sent'::pending_user_status
  END,
  "token_version" = COALESCE("token_version", 1)
WHERE
  "registration_session_id" IS NULL
  OR "status" IS NULL;

ALTER TABLE "pending_users"
  ALTER COLUMN "registration_session_id" SET NOT NULL,
  ALTER COLUMN "status" SET NOT NULL;

DROP INDEX IF EXISTS "pending_users_email_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "pending_users_session_unique"
  ON "pending_users" ("registration_session_id");

CREATE INDEX IF NOT EXISTS "pending_users_email_idx"
  ON "pending_users" ("email");

CREATE INDEX IF NOT EXISTS "pending_users_status_idx"
  ON "pending_users" ("status");