-- Add game_ended column to games table
-- This marks when a game has finished (either manually ended by host or all questions completed)
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_ended BOOLEAN DEFAULT false;

