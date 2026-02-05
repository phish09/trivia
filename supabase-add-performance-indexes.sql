-- Performance optimization indexes
-- These indexes improve query performance for common operations

-- Composite index for leaderboard queries (players sorted by score)
-- This significantly speeds up queries that fetch players ordered by score
CREATE INDEX IF NOT EXISTS idx_players_game_score ON players(game_id, score DESC);

-- Composite index for player_answers lookups (frequently queried together)
-- This speeds up queries that check if a player has answered a specific question
CREATE INDEX IF NOT EXISTS idx_player_answers_player_question ON player_answers(player_id, question_id);

-- Index for filtering player_answers by question_id and created_at (for answer ordering)
-- This speeds up queries that fetch all answers for a question ordered by submission time
CREATE INDEX IF NOT EXISTS idx_player_answers_question_created ON player_answers(question_id, created_at DESC);

-- Index for questions ordered by question_order (frequently used for sorting)
CREATE INDEX IF NOT EXISTS idx_questions_game_order ON questions(game_id, question_order ASC);

-- Note: The following indexes already exist from previous migrations:
-- - idx_player_answers_player_id ON player_answers(player_id)
-- - idx_player_answers_question_id ON player_answers(question_id)
-- - idx_players_game_id ON players(game_id)
-- - idx_questions_game_id ON questions(game_id)
-- - idx_games_code ON games(code)
