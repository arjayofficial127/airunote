-- Migration: Align Airunote database with Constitution v1.0 invariants
-- Ensures structural guarantees for ownership, boundaries, and root integrity

-- =====================================================
-- 1. Exactly ONE org root per org
-- =====================================================

CREATE UNIQUE INDEX IF NOT EXISTS "airu_one_org_root_per_org"
ON "airu_folders" ("org_id")
WHERE "human_id" = '__org_root__';

--> statement-breakpoint

-- =====================================================
-- 2. Enforce org root self-parent rule
-- =====================================================

-- Check constraint may already exist from 0002, but ensure it's present
ALTER TABLE IF EXISTS "airu_folders"
  DROP CONSTRAINT IF EXISTS "airu_org_root_self_parent_check";

ALTER TABLE IF EXISTS "airu_folders"
  ADD CONSTRAINT "airu_org_root_self_parent_check"
  CHECK (
    "human_id" != '__org_root__'
    OR "parent_folder_id" = "id"
  );

--> statement-breakpoint

-- =====================================================
-- 3. Ensure user root uniqueness per org
-- =====================================================

-- Unique constraint may already exist from 0001, but ensure index exists
CREATE UNIQUE INDEX IF NOT EXISTS "airu_user_roots_unique_per_org_user"
ON "airu_user_roots" ("org_id", "user_id");

--> statement-breakpoint

-- =====================================================
-- 4. Reassert correct deletion lifecycle
-- =====================================================

-- Ensure airu_user_roots.root_folder_id FK uses ON DELETE CASCADE
-- May already exist from 0002, but reassert for idempotency
-- Handle both possible constraint names from different migrations

ALTER TABLE IF EXISTS "airu_user_roots"
  DROP CONSTRAINT IF EXISTS "airu_user_roots_root_folder_id_fk";

ALTER TABLE IF EXISTS "airu_user_roots"
  DROP CONSTRAINT IF EXISTS "airu_user_roots_root_folder_id_airu_folders_id_fk";

ALTER TABLE IF EXISTS "airu_user_roots"
  ADD CONSTRAINT "airu_user_roots_root_folder_id_airu_folders_id_fk"
  FOREIGN KEY ("root_folder_id")
  REFERENCES "airu_folders"("id")
  ON DELETE CASCADE;
