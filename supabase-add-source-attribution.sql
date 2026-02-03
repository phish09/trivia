-- Add source/attribution column to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS source TEXT;
