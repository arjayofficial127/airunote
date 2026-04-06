ALTER TABLE "users"
  DROP COLUMN IF EXISTS "registration_mfa_code_hash",
  DROP COLUMN IF EXISTS "registration_mfa_expires_at",
  DROP COLUMN IF EXISTS "registration_mfa_attempt_count",
  DROP COLUMN IF EXISTS "registration_mfa_last_sent_at";