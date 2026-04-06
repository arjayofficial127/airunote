ALTER TABLE "pending_users"
  ADD COLUMN IF NOT EXISTS "ip_address" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "user_agent_hash" VARCHAR(255);