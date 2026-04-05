CREATE TABLE IF NOT EXISTS "pending_users" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" VARCHAR(255) NOT NULL,
  "verification_code_hash" VARCHAR(255) NOT NULL,
  "code_expires_at" TIMESTAMP NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_sent_at" TIMESTAMP NOT NULL DEFAULT now(),
  "verified_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "pending_users_email_unique"
  ON "pending_users" ("email");

CREATE INDEX IF NOT EXISTS "pending_users_code_expires_idx"
  ON "pending_users" ("code_expires_at");

CREATE INDEX IF NOT EXISTS "pending_users_verified_idx"
  ON "pending_users" ("verified_at");