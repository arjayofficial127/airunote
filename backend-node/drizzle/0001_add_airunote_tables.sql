--
-- Migration: Add Airunote core domain tables (corrected)
-- Phase 0: Domain Skeleton (strict lifecycle discipline)
--

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE "airu_visibility" AS ENUM('private', 'org', 'public');
--> statement-breakpoint

CREATE TYPE "airu_document_type" AS ENUM('TXT', 'MD', 'RTF');
--> statement-breakpoint

CREATE TYPE "airu_document_state" AS ENUM('active', 'archived', 'trashed');
--> statement-breakpoint

CREATE TYPE "airu_shortcut_target_type" AS ENUM('folder', 'document');
--> statement-breakpoint


-- =====================================================
-- airu_folders
-- =====================================================

CREATE TABLE IF NOT EXISTS "airu_folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"parent_folder_id" uuid NOT NULL,
	"human_id" varchar(255) NOT NULL,
	"visibility" "airu_visibility" DEFAULT 'private' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,

	CONSTRAINT "airu_folders_org_id_fk"
		FOREIGN KEY ("org_id")
		REFERENCES "orgs"("id")
		ON DELETE CASCADE,

	CONSTRAINT "airu_folders_owner_user_id_fk"
		FOREIGN KEY ("owner_user_id")
		REFERENCES "users"("id")
		ON DELETE CASCADE,

	CONSTRAINT "airu_folders_parent_folder_id_fk"
		FOREIGN KEY ("parent_folder_id")
		REFERENCES "airu_folders"("id")
		ON DELETE RESTRICT,

	CONSTRAINT "airu_folders_org_owner_parent_human_unique"
		UNIQUE("org_id", "owner_user_id", "parent_folder_id", "human_id")
);
--> statement-breakpoint


-- Indexes for real-world query paths
CREATE INDEX IF NOT EXISTS "airu_folders_org_idx"
	ON "airu_folders"("org_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "airu_folders_parent_folder_idx"
	ON "airu_folders"("parent_folder_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "airu_folders_org_owner_idx"
	ON "airu_folders"("org_id", "owner_user_id");
--> statement-breakpoint


-- =====================================================
-- airu_documents
-- =====================================================

CREATE TABLE IF NOT EXISTS "airu_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"folder_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"type" "airu_document_type" NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"visibility" "airu_visibility" DEFAULT 'private' NOT NULL,
	"state" "airu_document_state" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,

	CONSTRAINT "airu_documents_folder_id_fk"
		FOREIGN KEY ("folder_id")
		REFERENCES "airu_folders"("id")
		ON DELETE RESTRICT,

	CONSTRAINT "airu_documents_owner_user_id_fk"
		FOREIGN KEY ("owner_user_id")
		REFERENCES "users"("id")
		ON DELETE CASCADE,

	CONSTRAINT "airu_documents_folder_name_unique"
		UNIQUE("folder_id", "name")
);
--> statement-breakpoint


CREATE INDEX IF NOT EXISTS "airu_documents_folder_idx"
	ON "airu_documents"("folder_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "airu_documents_owner_idx"
	ON "airu_documents"("owner_user_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "airu_documents_state_idx"
	ON "airu_documents"("state");
--> statement-breakpoint


-- =====================================================
-- airu_shortcuts
-- =====================================================

CREATE TABLE IF NOT EXISTS "airu_shortcuts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"target_type" "airu_shortcut_target_type" NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,

	CONSTRAINT "airu_shortcuts_org_id_fk"
		FOREIGN KEY ("org_id")
		REFERENCES "orgs"("id")
		ON DELETE CASCADE,

	CONSTRAINT "airu_shortcuts_owner_user_id_fk"
		FOREIGN KEY ("owner_user_id")
		REFERENCES "users"("id")
		ON DELETE CASCADE
);
--> statement-breakpoint


CREATE INDEX IF NOT EXISTS "airu_shortcuts_org_idx"
	ON "airu_shortcuts"("org_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "airu_shortcuts_owner_idx"
	ON "airu_shortcuts"("owner_user_id");
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "airu_shortcuts_target_idx"
	ON "airu_shortcuts"("target_type", "target_id");
--> statement-breakpoint


-- =====================================================
-- airu_user_roots
-- =====================================================

CREATE TABLE IF NOT EXISTS "airu_user_roots" (
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"root_folder_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,

	CONSTRAINT "airu_user_roots_org_id_fk"
		FOREIGN KEY ("org_id")
		REFERENCES "orgs"("id")
		ON DELETE CASCADE,

	CONSTRAINT "airu_user_roots_user_id_fk"
		FOREIGN KEY ("user_id")
		REFERENCES "users"("id")
		ON DELETE CASCADE,

	CONSTRAINT "airu_user_roots_root_folder_id_fk"
		FOREIGN KEY ("root_folder_id")
		REFERENCES "airu_folders"("id")
		ON DELETE RESTRICT,

	CONSTRAINT "airu_user_roots_org_user_unique"
		UNIQUE("org_id", "user_id")
);
--> statement-breakpoint