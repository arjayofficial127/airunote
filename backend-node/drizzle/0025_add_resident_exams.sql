CREATE TABLE IF NOT EXISTS "exam_org_settings" (
  "org_id" uuid PRIMARY KEY REFERENCES "orgs"("id") ON DELETE CASCADE,
  "journey_mode" varchar(20) NOT NULL DEFAULT 'exam_first',
  "visible_top_level_apps" jsonb NOT NULL DEFAULT '["exams", "airunote"]'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "exam_org_settings_journey_mode_check" CHECK ("journey_mode" IN ('exam_first', 'standard'))
);

CREATE TABLE IF NOT EXISTS "exams" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "org_id" uuid NOT NULL REFERENCES "orgs"("id") ON DELETE CASCADE,
  "created_by_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "title" varchar(300) NOT NULL,
  "description" text,
  "status" varchar(20) NOT NULL DEFAULT 'draft',
  "public_id" uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  "duration_minutes" integer NOT NULL DEFAULT 20,
  "one_question_at_a_time" boolean NOT NULL DEFAULT true,
  "prevent_focus_loss" boolean NOT NULL DEFAULT true,
  "max_attempts" integer NOT NULL DEFAULT 3,
  "review_mode" varchar(30) NOT NULL DEFAULT 'respondent_answers',
  "shuffle_questions" boolean NOT NULL DEFAULT false,
  "shuffle_options" boolean NOT NULL DEFAULT false,
  "require_email" boolean NOT NULL DEFAULT false,
  "require_identifier" boolean NOT NULL DEFAULT false,
  "starts_at" timestamp,
  "ends_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "exams_status_check" CHECK ("status" IN ('draft', 'published', 'closed')),
  CONSTRAINT "exams_duration_check" CHECK ("duration_minutes" BETWEEN 1 AND 1440),
  CONSTRAINT "exams_attempts_check" CHECK ("max_attempts" BETWEEN 1 AND 100),
  CONSTRAINT "exams_review_mode_check" CHECK ("review_mode" IN ('none', 'respondent_answers', 'with_correct_answers'))
);

CREATE INDEX IF NOT EXISTS "exams_org_status_idx" ON "exams" ("org_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "exams_public_id_idx" ON "exams" ("public_id");
CREATE INDEX IF NOT EXISTS "exams_creator_idx" ON "exams" ("created_by_user_id");

CREATE TABLE IF NOT EXISTS "exam_sections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "exam_id" uuid NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
  "title" varchar(300) NOT NULL,
  "description" text,
  "position" integer NOT NULL DEFAULT 0,
  "pinned" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "exam_sections_exam_position_idx" ON "exam_sections" ("exam_id", "position");

CREATE TABLE IF NOT EXISTS "exam_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "exam_id" uuid NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
  "section_id" uuid REFERENCES "exam_sections"("id") ON DELETE SET NULL,
  "type" varchar(30) NOT NULL,
  "prompt" text NOT NULL,
  "explanation" text,
  "position" integer NOT NULL DEFAULT 0,
  "required" boolean NOT NULL DEFAULT true,
  "graded" boolean NOT NULL DEFAULT true,
  "points" integer NOT NULL DEFAULT 1,
  "pinned" boolean NOT NULL DEFAULT false,
  "correct_answers" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "exam_questions_type_check" CHECK ("type" IN ('single_choice', 'multiple_choice', 'true_false', 'short_text')),
  CONSTRAINT "exam_questions_points_check" CHECK ("points" BETWEEN 0 AND 10000)
);
CREATE INDEX IF NOT EXISTS "exam_questions_exam_position_idx" ON "exam_questions" ("exam_id", "position");
CREATE INDEX IF NOT EXISTS "exam_questions_section_idx" ON "exam_questions" ("section_id");

CREATE TABLE IF NOT EXISTS "exam_question_options" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "question_id" uuid NOT NULL REFERENCES "exam_questions"("id") ON DELETE CASCADE,
  "label" text NOT NULL,
  "position" integer NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "exam_question_options_question_position_idx" ON "exam_question_options" ("question_id", "position");

CREATE TABLE IF NOT EXISTS "exam_attempts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "exam_id" uuid NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
  "access_token_hash" varchar(64) NOT NULL UNIQUE,
  "respondent_name" varchar(255) NOT NULL,
  "respondent_email" varchar(255),
  "respondent_identifier" varchar(255),
  "identity_key_hash" varchar(64) NOT NULL,
  "device_hash" varchar(64) NOT NULL,
  "ip_hash" varchar(64) NOT NULL,
  "user_agent_hash" varchar(64) NOT NULL,
  "attempt_number" integer NOT NULL,
  "status" varchar(20) NOT NULL DEFAULT 'in_progress',
  "question_order" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "option_order" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "focus_violation_count" integer NOT NULL DEFAULT 0,
  "resume_count" integer NOT NULL DEFAULT 0,
  "extra_time_seconds" integer NOT NULL DEFAULT 0,
  "termination_reason" text,
  "started_at" timestamp NOT NULL DEFAULT now(),
  "last_active_at" timestamp NOT NULL DEFAULT now(),
  "completed_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "exam_attempts_status_check" CHECK ("status" IN ('in_progress', 'completed', 'terminated'))
);
CREATE INDEX IF NOT EXISTS "exam_attempts_exam_status_idx" ON "exam_attempts" ("exam_id", "status");
CREATE INDEX IF NOT EXISTS "exam_attempts_exam_identity_idx" ON "exam_attempts" ("exam_id", "identity_key_hash");
CREATE INDEX IF NOT EXISTS "exam_attempts_exam_device_idx" ON "exam_attempts" ("exam_id", "device_hash");
CREATE INDEX IF NOT EXISTS "exam_attempts_last_active_idx" ON "exam_attempts" ("last_active_at");

CREATE TABLE IF NOT EXISTS "exam_answers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "attempt_id" uuid NOT NULL REFERENCES "exam_attempts"("id") ON DELETE CASCADE,
  "question_id" uuid NOT NULL REFERENCES "exam_questions"("id") ON DELETE RESTRICT,
  "answer" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "saved_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "exam_answers_attempt_question_unique" UNIQUE ("attempt_id", "question_id")
);
CREATE INDEX IF NOT EXISTS "exam_answers_attempt_idx" ON "exam_answers" ("attempt_id");
CREATE INDEX IF NOT EXISTS "exam_answers_question_idx" ON "exam_answers" ("question_id");

CREATE TABLE IF NOT EXISTS "exam_attempt_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "attempt_id" uuid NOT NULL REFERENCES "exam_attempts"("id") ON DELETE CASCADE,
  "event_type" varchar(40) NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "exam_attempt_events_attempt_created_idx" ON "exam_attempt_events" ("attempt_id", "created_at");
CREATE INDEX IF NOT EXISTS "exam_attempt_events_type_idx" ON "exam_attempt_events" ("event_type");
