CREATE TABLE IF NOT EXISTS exam_access_codes (exam_id uuid PRIMARY KEY REFERENCES exams(id) ON DELETE CASCADE, code_hash text NOT NULL);
