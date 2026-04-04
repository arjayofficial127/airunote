CREATE TABLE IF NOT EXISTS "billing_intents" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" UUID NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
  "created_by_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "user_email" VARCHAR(255) NOT NULL,
  "target_plan" VARCHAR(50) NOT NULL DEFAULT 'pro',
  "source" VARCHAR(100) NOT NULL DEFAULT 'unknown',
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "lemon_subscription_id" VARCHAR(255),
  "lemon_order_id" VARCHAR(255),
  "lemon_customer_id" VARCHAR(255),
  "lemon_customer_email" VARCHAR(255),
  "last_event_name" VARCHAR(100),
  "failure_reason" TEXT,
  "completed_at" TIMESTAMP,
  "resolved_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "billing_intents_org_status_idx"
ON "billing_intents" ("org_id", "status");

CREATE INDEX IF NOT EXISTS "billing_intents_user_status_idx"
ON "billing_intents" ("created_by_user_id", "status");

CREATE INDEX IF NOT EXISTS "billing_intents_subscription_idx"
ON "billing_intents" ("lemon_subscription_id");

CREATE UNIQUE INDEX IF NOT EXISTS "billing_intents_subscription_unique"
ON "billing_intents" ("lemon_subscription_id")
WHERE "lemon_subscription_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "billing_intents_order_idx"
ON "billing_intents" ("lemon_order_id");

CREATE UNIQUE INDEX IF NOT EXISTS "billing_intents_order_unique"
ON "billing_intents" ("lemon_order_id")
WHERE "lemon_order_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "billing_intents_customer_idx"
ON "billing_intents" ("lemon_customer_id");

CREATE INDEX IF NOT EXISTS "billing_intents_user_email_idx"
ON "billing_intents" ("user_email");

CREATE INDEX IF NOT EXISTS "billing_intents_customer_email_idx"
ON "billing_intents" ("lemon_customer_email");

CREATE UNIQUE INDEX IF NOT EXISTS "billing_intents_active_pending_unique"
ON "billing_intents" ("org_id", "created_by_user_id", "target_plan")
WHERE "status" = 'pending';