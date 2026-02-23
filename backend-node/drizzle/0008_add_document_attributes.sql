-- Migration: Add attributes column to airu_documents
-- Phase 7 — Hybrid Attribute Engine
-- 
-- Adds flexible JSONB attributes column with default empty object
-- Existing documents will have attributes = '{}'

BEGIN;

-- Add attributes column with default empty object
ALTER TABLE "airu_documents" 
ADD COLUMN IF NOT EXISTS "attributes" jsonb NOT NULL DEFAULT '{}';

-- Backfill existing rows (defensive, though default handles this)
UPDATE "airu_documents" 
SET "attributes" = '{}' 
WHERE "attributes" IS NULL;

COMMIT;
