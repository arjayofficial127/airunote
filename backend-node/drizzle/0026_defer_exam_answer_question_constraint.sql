ALTER TABLE "exam_answers"
  DROP CONSTRAINT IF EXISTS "exam_answers_question_id_fkey";

ALTER TABLE "exam_answers"
  DROP CONSTRAINT IF EXISTS "exam_answers_question_id_exam_questions_id_fk";

ALTER TABLE "exam_answers"
  ADD CONSTRAINT "exam_answers_question_id_fkey"
  FOREIGN KEY ("question_id") REFERENCES "exam_questions"("id")
  ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED;
