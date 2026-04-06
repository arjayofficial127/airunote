CREATE TABLE IF NOT EXISTS "password_reset_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "email" varchar(255) NOT NULL,
  "reset_token_hash" varchar(255) NOT NULL,
  "expires_at" timestamp NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "used_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "password_reset_requests_email_idx"
  ON "password_reset_requests" ("email");

CREATE INDEX IF NOT EXISTS "password_reset_requests_expires_idx"
  ON "password_reset_requests" ("expires_at");

CREATE INDEX IF NOT EXISTS "password_reset_requests_user_id_idx"
  ON "password_reset_requests" ("user_id");

CREATE INDEX IF NOT EXISTS "password_reset_requests_token_hash_idx"
  ON "password_reset_requests" ("reset_token_hash");