-- Add question_start_time to games table
-- This stores the timestamp when a question was activated, used for server-side timer calculation
ALTER TABLE games ADD COLUMN IF NOT EXISTS question_start_time TIMESTAMPTZ;





