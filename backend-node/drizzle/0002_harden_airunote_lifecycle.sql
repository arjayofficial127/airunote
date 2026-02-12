-- Migration: Harden Airunote lifecycle and constraints
-- Part 1: Fix deletion lifecycle mismatch
-- Part 3: Add check constraint for org root self-parent rule

-- =====================================================
-- PART 1: Fix deletion lifecycle mismatch
-- =====================================================

-- Change airu_user_roots.root_folder_id foreign key from RESTRICT to CASCADE
-- This prevents referential conflict when user deletion cascades folder deletion

ALTER TABLE IF EXISTS "airu_user_roots"
  DROP CONSTRAINT IF EXISTS "airu_user_roots_root_folder_id_airu_folders_id_fk";

ALTER TABLE IF EXISTS "airu_user_roots"
  ADD CONSTRAINT "airu_user_roots_root_folder_id_airu_folders_id_fk"
  FOREIGN KEY ("root_folder_id")
  REFERENCES "airu_folders"("id")
  ON DELETE CASCADE;

--> statement-breakpoint

-- =====================================================
-- PART 3: Add check constraint for org root self-parent rule
-- =====================================================

-- Enforce that org root folders (human_id = '__org_root__') must have parent_folder_id = id
ALTER TABLE IF EXISTS "airu_folders"
  ADD CONSTRAINT IF NOT EXISTS "airu_org_root_self_parent_check"
  CHECK (
    "human_id" != '__org_root__'
    OR "parent_folder_id" = "id"
  );
