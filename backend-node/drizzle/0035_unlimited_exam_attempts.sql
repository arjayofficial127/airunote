ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_attempts_check;
ALTER TABLE exams ADD CONSTRAINT exams_attempts_check CHECK (max_attempts BETWEEN 0 AND 100);
