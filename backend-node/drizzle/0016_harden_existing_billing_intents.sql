DO $$
BEGIN
  ALTER TABLE "billing_intents" ADD COLUMN IF NOT EXISTS "target_plan" VARCHAR(50);
  ALTER TABLE "billing_intents" ADD COLUMN IF NOT EXISTS "source" VARCHAR(100);
  ALTER TABLE "billing_intents" ADD COLUMN IF NOT EXISTS "last_event_name" VARCHAR(100);
  ALTER TABLE "billing_intents" ADD COLUMN IF NOT EXISTS "failure_reason" TEXT;
  ALTER TABLE "billing_intents" ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMP;
END $$;

UPDATE "billing_intents"
SET "target_plan" = COALESCE("target_plan", 'pro'),
    "source" = COALESCE("source", 'unknown')
WHERE "target_plan" IS NULL OR "source" IS NULL;

ALTER TABLE "billing_intents"
ALTER COLUMN "target_plan" SET DEFAULT 'pro',
ALTER COLUMN "target_plan" SET NOT NULL,
ALTER COLUMN "source" SET DEFAULT 'unknown',
ALTER COLUMN "source" SET NOT NULL;

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