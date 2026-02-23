-- Migration: Add airu_lens_items table for projection engine
-- Supports board, canvas, and book lens types
-- Do NOT modify documents or folders

BEGIN;

-- =====================================================
-- Create airu_lens_items table
-- =====================================================

CREATE TABLE IF NOT EXISTS "airu_lens_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "lens_id" uuid NOT NULL REFERENCES "airu_lenses"("id") ON DELETE CASCADE,
  "entity_id" uuid NOT NULL,
  "entity_type" varchar(20) NOT NULL CHECK ("entity_type" IN ('document', 'folder')),
  "column_id" varchar(100) NULL,
  "order" numeric NULL,
  "x" numeric NULL,
  "y" numeric NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- Add indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS "idx_lens_items_lens_id" ON "airu_lens_items"("lens_id");

CREATE INDEX IF NOT EXISTS "idx_lens_items_lens_entity" ON "airu_lens_items"("lens_id", "entity_type", "entity_id");

CREATE INDEX IF NOT EXISTS "idx_lens_items_lens_column" ON "airu_lens_items"("lens_id", "column_id") WHERE "column_id" IS NOT NULL;

COMMIT;
