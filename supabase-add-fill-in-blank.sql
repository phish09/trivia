-- Add is_fill_in_blank column to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_fill_in_blank BOOLEAN DEFAULT false;

-- Make answer_index nullable to support fill-in-the-blank questions
ALTER TABLE player_answers ALTER COLUMN answer_index DROP NOT NULL;

-- Add text_answer column to player_answers table for fill-in-the-blank answers
ALTER TABLE player_answers ADD COLUMN IF NOT EXISTS text_answer TEXT;

-- Add manually_scored column to player_answers to track if host has manually scored this answer
ALTER TABLE player_answers ADD COLUMN IF NOT EXISTS manually_scored BOOLEAN DEFAULT false;

