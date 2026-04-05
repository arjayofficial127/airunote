DO $$
BEGIN
  ALTER TABLE "pending_users" ADD COLUMN IF NOT EXISTS "last_sent_at" TIMESTAMP NOT NULL DEFAULT now();
  ALTER TABLE "pending_users" ADD COLUMN IF NOT EXISTS "verified_at" TIMESTAMP;

  ALTER TABLE "pending_users" DROP COLUMN IF EXISTS "name";
  ALTER TABLE "pending_users" DROP COLUMN IF EXISTS "password_hash";
END $$;

CREATE INDEX IF NOT EXISTS "pending_users_verified_idx"
  ON "pending_users" ("verified_at");