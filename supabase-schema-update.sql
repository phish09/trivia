-- Add game control fields
ALTER TABLE games ADD COLUMN IF NOT EXISTS current_question_index INTEGER;
ALTER TABLE games ADD COLUMN IF NOT EXISTS answers_revealed BOOLEAN DEFAULT false;

-- Add score to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0;

-- Create player_answers table
CREATE TABLE IF NOT EXISTS player_answers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  answer_index INTEGER NOT NULL,
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, question_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_player_answers_player_id ON player_answers(player_id);
CREATE INDEX IF NOT EXISTS idx_player_answers_question_id ON player_answers(question_id);

-- Enable RLS
ALTER TABLE player_answers ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all operations on player_answers" ON player_answers FOR ALL USING (true) WITH CHECK (true);

