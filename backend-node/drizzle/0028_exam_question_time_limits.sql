ALTER TABLE exam_questions
  ADD COLUMN IF NOT EXISTS max_time_seconds integer;

ALTER TABLE exam_attempts
  ADD COLUMN IF NOT EXISTS question_timing jsonb NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'exam_questions_max_time_seconds_check'
  ) THEN
    ALTER TABLE exam_questions
      ADD CONSTRAINT exam_questions_max_time_seconds_check
      CHECK (max_time_seconds IS NULL OR (max_time_seconds >= 5 AND max_time_seconds <= 3600));
  END IF;
END $$;
