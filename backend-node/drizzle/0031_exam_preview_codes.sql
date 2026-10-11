CREATE TABLE IF NOT EXISTS exam_preview_codes (exam_id uuid PRIMARY KEY REFERENCES exams(id) ON DELETE CASCADE, code_hash text NOT NULL);
