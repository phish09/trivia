-- Add activity tracking columns to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_started BOOLEAN DEFAULT false;
ALTER TABLE games ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Set last_activity for existing games to their created_at
UPDATE games SET last_activity = created_at WHERE last_activity IS NULL;

