ALTER TABLE exam_questions DROP CONSTRAINT IF EXISTS exam_questions_type_check;
ALTER TABLE exam_questions ADD CONSTRAINT exam_questions_type_check
  CHECK (type IN ('single_choice', 'multiple_choice', 'true_false', 'short_text', 'date'));
