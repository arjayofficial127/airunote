-- Migration: Add sharing and canonical/shared content split
-- Phase 2: Sharing Engine (Access Expansion Only)

-- =====================================================
-- 1. Create airu_shares table
-- =====================================================

-- Create airu_share_type enum (idempotent)
DO $$ BEGIN
  CREATE TYPE "airu_share_type" AS ENUM('user', 'org', 'public', 'link');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "airu_shares" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "target_type" "airu_shortcut_target_type" NOT NULL, -- 'folder' | 'document'
  "target_id" uuid NOT NULL,
  "share_type" "airu_share_type" NOT NULL,
  "granted_to_user_id" uuid, -- nullable (for org/public/link)
  "link_code" varchar(50), -- nullable (for link shares)
  "link_password_hash" varchar(255), -- nullable
  "view_only" boolean DEFAULT true NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp, -- nullable
  CONSTRAINT "airu_shares_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE,
  CONSTRAINT "airu_shares_granted_to_user_id_fk" FOREIGN KEY ("granted_to_user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "airu_shares_created_by_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "airu_shares_unique" UNIQUE("org_id", "target_type", "target_id", "share_type", "granted_to_user_id", "link_code")
);

CREATE INDEX IF NOT EXISTS "airu_shares_target_idx" ON "airu_shares"("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "airu_shares_user_idx" ON "airu_shares"("granted_to_user_id");
CREATE INDEX IF NOT EXISTS "airu_shares_link_code_idx" ON "airu_shares"("link_code");

--> statement-breakpoint

-- =====================================================
-- 2. Add canonical/shared columns to airu_documents
-- =====================================================

-- Add canonical_content column (idempotent)
DO $$ BEGIN
  ALTER TABLE "airu_documents"
    ADD COLUMN "canonical_content" text NOT NULL DEFAULT '';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Add shared_content column (idempotent)
DO $$ BEGIN
  ALTER TABLE "airu_documents"
    ADD COLUMN "shared_content" text;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

-- Migrate existing content to canonical_content
UPDATE "airu_documents"
SET "canonical_content" = COALESCE("content", '')
WHERE "canonical_content" = '' OR "canonical_content" IS NULL;

-- Make content column nullable (will be deprecated in favor of canonical_content)
-- This is safe to run multiple times
DO $$ BEGIN
  ALTER TABLE "airu_documents"
    ALTER COLUMN "content" DROP NOT NULL;
EXCEPTION
  WHEN OTHERS THEN null; -- Ignore if already nullable or column doesn't exist
END $$;

--> statement-breakpoint

-- =====================================================
-- 3. Create airu_document_revisions table
-- =====================================================

-- Create airu_content_type enum (idempotent)
DO $$ BEGIN
  CREATE TYPE "airu_content_type" AS ENUM('canonical', 'shared');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "airu_document_revisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "document_id" uuid NOT NULL,
  "content_type" "airu_content_type" NOT NULL,
  "content" text NOT NULL,
  "created_by_user_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "airu_document_revisions_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "airu_documents"("id") ON DELETE CASCADE,
  CONSTRAINT "airu_document_revisions_created_by_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "airu_document_revisions_document_idx" ON "airu_document_revisions"("document_id");
CREATE INDEX IF NOT EXISTS "airu_document_revisions_created_at_idx" ON "airu_document_revisions"("created_at");
