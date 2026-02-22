-- Migration: Add folder type and metadata to airu_folders table
-- Safe, idempotent migration for Neon/Postgres
-- 
-- Table Name: airu_folders
-- Detected from: backend-node/src/infrastructure/db/drizzle/schema.ts
--   - Schema definition: airuFoldersTable = pgTable('airu_folders', ...)
--   - Confirmed in: drizzle/0001_add_airunote_tables.sql (CREATE TABLE "airu_folders")

BEGIN;

-- =====================================================
-- Add "type" column (TEXT NOT NULL DEFAULT 'box')
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'airu_folders' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE "airu_folders" 
        ADD COLUMN "type" TEXT NOT NULL DEFAULT 'box';
        
        RAISE NOTICE 'Added "type" column to airu_folders';
    ELSE
        RAISE NOTICE 'Column "type" already exists in airu_folders, skipping';
    END IF;
END $$;

-- =====================================================
-- Add "metadata" column (JSONB NULL)
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'airu_folders' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE "airu_folders" 
        ADD COLUMN "metadata" JSONB NULL;
        
        RAISE NOTICE 'Added "metadata" column to airu_folders';
    ELSE
        RAISE NOTICE 'Column "metadata" already exists in airu_folders, skipping';
    END IF;
END $$;

-- =====================================================
-- Backfill: Set type='box' for any NULL values
-- =====================================================

UPDATE "airu_folders" 
SET "type" = 'box' 
WHERE "type" IS NULL;

-- =====================================================
-- Add CHECK constraint for type values
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'airu_folders' 
        AND constraint_name = 'airu_folders_type_check'
    ) THEN
        ALTER TABLE "airu_folders" 
        ADD CONSTRAINT "airu_folders_type_check" 
        CHECK ("type" IN ('box', 'book', 'board'));
        
        RAISE NOTICE 'Added CHECK constraint for type column';
    ELSE
        RAISE NOTICE 'CHECK constraint airu_folders_type_check already exists, skipping';
    END IF;
END $$;

COMMIT;

-- =====================================================
-- Verification (optional - can be run separately)
-- =====================================================
-- Uncomment to verify migration:
-- SELECT 
--     column_name, 
--     data_type, 
--     is_nullable, 
--     column_default
-- FROM information_schema.columns 
-- WHERE table_name = 'airu_folders' 
-- AND column_name IN ('type', 'metadata')
-- ORDER BY column_name;
