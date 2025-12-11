-- Add question_order column to questions table for drag-and-drop reordering
-- Using question_order instead of "order" to avoid reserved keyword issues
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_order INTEGER DEFAULT 0;

-- Create index for better performance when ordering
CREATE INDEX IF NOT EXISTS idx_questions_order ON questions(game_id, question_order);

