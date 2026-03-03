-- Migration: Add view_mode column to airu_lens_items table
-- Allows per-lens-item document view mode override

ALTER TABLE "airu_lens_items" 
ADD COLUMN IF NOT EXISTS "view_mode" VARCHAR(20) NULL;

-- Add comment
COMMENT ON COLUMN "airu_lens_items"."view_mode" IS 'Document view mode override: list, icon, preview, full, or NULL for fallback';
