-- Migration: Add query optimization indexes
-- Phase 8.1 — Query Optimization
-- 
-- Adds database indexes to support JSONB filtering and projection queries
-- All indexes are idempotent (IF NOT EXISTS)

BEGIN;

-- =====================================================
-- GIN index on airu_documents.attributes
-- Supports efficient JSONB queries on attributes
-- =====================================================

CREATE INDEX IF NOT EXISTS "idx_documents_attributes_gin"
ON "airu_documents"
USING GIN ("attributes");

-- =====================================================
-- GIN index on attributes->'tags' (if tags are inside attributes)
-- Supports efficient tag filtering
-- =====================================================

CREATE INDEX IF NOT EXISTS "idx_documents_tags"
ON "airu_documents"
USING GIN (("attributes"->'tags'));

-- =====================================================
-- Index on airu_documents.folder_id (parent folder)
-- Supports efficient folder-based queries
-- Note: This may already exist as airu_documents_folder_idx,
-- but we'll add it with a different name for clarity
-- =====================================================

-- Check if index already exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_documents_parent_folder'
  ) THEN
    CREATE INDEX "idx_documents_parent_folder"
    ON "airu_documents"("folder_id");
  END IF;
END $$;

-- =====================================================
-- Index on airu_lenses.folder_id
-- Note: This may already exist as airu_lenses_folder_id_idx,
-- but we'll ensure it exists
-- =====================================================

-- Check if index already exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_lenses_folder_id'
  ) THEN
    CREATE INDEX "idx_lenses_folder_id"
    ON "airu_lenses"("folder_id");
  END IF;
END $$;

-- =====================================================
-- Index on airu_lenses.type
-- Supports efficient filtering by lens type
-- =====================================================

CREATE INDEX IF NOT EXISTS "idx_lenses_type"
ON "airu_lenses"("type");

-- =====================================================
-- Index on airu_documents.updated_at
-- Supports efficient sorting by update time
-- =====================================================

CREATE INDEX IF NOT EXISTS "idx_documents_updated_at"
ON "airu_documents"("updated_at");

COMMIT;
