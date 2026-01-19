-- Add wagering columns to questions table
ALTER TABLE questions
ADD COLUMN IF NOT EXISTS has_wager BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS max_wager INTEGER;

-- Add wager column to player_answers table
ALTER TABLE player_answers
ADD COLUMN IF NOT EXISTS wager INTEGER;







