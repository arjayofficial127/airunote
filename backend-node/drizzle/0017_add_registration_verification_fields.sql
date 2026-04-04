DO $$
BEGIN
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMP;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "registration_mfa_code_hash" VARCHAR(255);
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "registration_mfa_expires_at" TIMESTAMP;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "registration_mfa_attempt_count" INTEGER;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "registration_mfa_last_sent_at" TIMESTAMP;
END $$;

UPDATE "users"
SET "email_verified_at" = COALESCE("email_verified_at", "created_at"),
    "registration_mfa_attempt_count" = COALESCE("registration_mfa_attempt_count", 0)
WHERE "email_verified_at" IS NULL
   OR "registration_mfa_attempt_count" IS NULL;

ALTER TABLE "users"
ALTER COLUMN "registration_mfa_attempt_count" SET DEFAULT 0,
ALTER COLUMN "registration_mfa_attempt_count" SET NOT NULL;