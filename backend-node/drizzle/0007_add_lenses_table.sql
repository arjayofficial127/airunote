-- Migration: Add lenses table and extend folders with defaultLensId
-- Phase 0 — Schema Freeze for Lens system
-- Additive only - no breaking changes

-- =====================================================
-- Create airu_lenses table
-- =====================================================

CREATE TABLE IF NOT EXISTS "airu_lenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "folder_id" uuid REFERENCES "airu_folders"("id") ON DELETE CASCADE,
  "name" varchar(120) NOT NULL,
  "type" varchar(20) NOT NULL,
  "is_default" boolean NOT NULL DEFAULT false,
  "metadata" jsonb NOT NULL DEFAULT '{}',
  "query" jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- Add indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS "airu_lenses_folder_id_idx" ON "airu_lenses"("folder_id");

-- Unique index on (folderId, isDefault) WHERE isDefault = true
-- This ensures only one default lens per folder
CREATE UNIQUE INDEX IF NOT EXISTS "airu_lenses_folder_default_unique"
ON "airu_lenses"("folder_id", "is_default")
WHERE "is_default" = true;

-- =====================================================
-- Extend airu_folders table with defaultLensId
-- =====================================================

ALTER TABLE "airu_folders"
  ADD COLUMN IF NOT EXISTS "default_lens_id" uuid;

-- Note: Foreign key constraint NOT added yet (as per requirements)
-- This will be added in a future phase
