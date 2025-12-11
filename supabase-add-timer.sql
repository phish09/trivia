-- Add timer fields to questions table
-- has_timer: boolean to enable/disable timer for this question
-- timer_seconds: integer for the timer duration in seconds (e.g., 15 = 15 seconds, 120 = 2 minutes)

ALTER TABLE questions ADD COLUMN IF NOT EXISTS has_timer BOOLEAN DEFAULT false;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS timer_seconds INTEGER;

