-- Migration: Extend folder type from ENUM to VARCHAR
-- Allows flexible folder types while maintaining backward compatibility
-- Phase: Folder Type System Extension

BEGIN;

-- =====================================================
-- Step 1: Add new VARCHAR column (temporary)
-- =====================================================

ALTER TABLE "airu_folders" 
  ADD COLUMN IF NOT EXISTS "type_varchar" VARCHAR(50);

-- =====================================================
-- Step 2: Copy existing enum values to VARCHAR column
-- =====================================================

UPDATE "airu_folders" 
SET "type_varchar" = "type"::text
WHERE "type_varchar" IS NULL;

-- =====================================================
-- Step 3: Set default for new column
-- =====================================================

ALTER TABLE "airu_folders" 
  ALTER COLUMN "type_varchar" SET DEFAULT 'box';

-- =====================================================
-- Step 4: Make VARCHAR column NOT NULL
-- =====================================================

UPDATE "airu_folders" 
SET "type_varchar" = 'box' 
WHERE "type_varchar" IS NULL;

ALTER TABLE "airu_folders" 
  ALTER COLUMN "type_varchar" SET NOT NULL;

-- =====================================================
-- Step 5: Drop old ENUM column
-- =====================================================

ALTER TABLE "airu_folders" 
  DROP COLUMN IF EXISTS "type";

-- =====================================================
-- Step 6: Rename VARCHAR column to "type"
-- =====================================================

ALTER TABLE "airu_folders" 
  RENAME COLUMN "type_varchar" TO "type";

-- =====================================================
-- Step 7: Add CHECK constraint for valid types (optional, for validation)
-- =====================================================

ALTER TABLE "airu_folders" 
  ADD CONSTRAINT "airu_folders_type_check" 
  CHECK (
    "type" IN (
      'box', 'board', 'book', 'canvas', 'collection', 
      'contacts', 'ledger', 'journal', 'manual', 
      'notebook', 'pipeline', 'project', 'wiki'
    )
  );

COMMIT;
