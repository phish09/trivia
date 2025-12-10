-- Add multiplier column to questions table (for existing databases)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS multiplier INTEGER NOT NULL DEFAULT 1;

