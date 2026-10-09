-- Additive migration. Apply with db:migrate:appearance; the runner also backfills legacy appearance.
CREATE TABLE IF NOT EXISTS exam_templates (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
 name varchar(100) NOT NULL, config jsonb NOT NULL, revision integer NOT NULL DEFAULT 1,
 legacy_key varchar(50), created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now(), archived_at timestamp,
 CONSTRAINT exam_templates_org_legacy_unique UNIQUE(org_id, legacy_key)
);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS appearance_template_id uuid REFERENCES exam_templates(id) ON DELETE RESTRICT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS appearance_config jsonb;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS appearance_revision integer NOT NULL DEFAULT 0;
ALTER TABLE exam_org_settings ADD COLUMN IF NOT EXISTS default_exam_template_id uuid REFERENCES exam_templates(id) ON DELETE RESTRICT;
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS appearance_config jsonb;
ALTER TABLE org_files ADD COLUMN IF NOT EXISTS deleted_at timestamp;
ALTER TABLE org_files ADD COLUMN IF NOT EXISTS storage_deleted_at timestamp;
CREATE TABLE IF NOT EXISTS exam_asset_usage (
 file_id uuid NOT NULL REFERENCES org_files(id) ON DELETE RESTRICT,
 owner_kind varchar(20) NOT NULL CHECK (owner_kind IN ('template','exam','attempt')),
 owner_id uuid NOT NULL, org_id uuid NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
 CONSTRAINT exam_asset_usage_unique UNIQUE(file_id,owner_kind,owner_id)
);
CREATE INDEX IF NOT EXISTS exam_templates_org_idx ON exam_templates(org_id);
CREATE INDEX IF NOT EXISTS exam_asset_usage_owner_idx ON exam_asset_usage(org_id,owner_kind,owner_id);
