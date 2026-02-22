-- Migration: Add folder type and metadata fields
-- Adds type ('box' | 'book' | 'board') and optional metadata (JSON) to folders

-- =====================================================
-- Create folder type enum
-- =====================================================

CREATE TYPE "airu_folder_type" AS ENUM('box', 'book', 'board');

-- =====================================================
-- Add type and metadata columns to airu_folders
-- =====================================================

ALTER TABLE "airu_folders" 
  ADD COLUMN "type" "airu_folder_type" NOT NULL DEFAULT 'box',
  ADD COLUMN "metadata" jsonb;

-- =====================================================
-- Backfill: Ensure all existing rows have type='box'
-- =====================================================

UPDATE "airu_folders" 
SET "type" = 'box' 
WHERE "type" IS NULL;

-- =====================================================
-- Verify: Ensure no NULL types exist
-- =====================================================

-- This will fail if any NULL types exist (defensive check)
ALTER TABLE "airu_folders" 
  ALTER COLUMN "type" SET NOT NULL;
