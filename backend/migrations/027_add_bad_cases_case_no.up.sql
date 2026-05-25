ALTER TABLE bad_cases ADD COLUMN IF NOT EXISTS case_no VARCHAR(20);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bad_cases_case_no ON bad_cases(case_no);
