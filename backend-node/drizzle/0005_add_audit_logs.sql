-- Migration: Add audit logs for destructive events
-- Phase 3: Deletion & Lifecycle Finalization

-- =====================================================
-- Create airu_audit_logs table
-- =====================================================

CREATE TABLE IF NOT EXISTS "airu_audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "event_type" varchar(50) NOT NULL, -- 'vault_deleted', 'document_deleted', 'folder_deleted', 'share_revoked', 'link_revoked'
  "target_type" varchar(50), -- 'folder', 'document', 'vault', 'share', 'link'
  "target_id" uuid,
  "performed_by_user_id" uuid NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "airu_audit_logs_org_id_fk" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE,
  CONSTRAINT "airu_audit_logs_performed_by_user_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "airu_audit_logs_org_idx" ON "airu_audit_logs"("org_id");
CREATE INDEX IF NOT EXISTS "airu_audit_logs_event_type_idx" ON "airu_audit_logs"("event_type");
CREATE INDEX IF NOT EXISTS "airu_audit_logs_created_at_idx" ON "airu_audit_logs"("created_at");
