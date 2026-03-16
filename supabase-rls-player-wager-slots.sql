-- Fix: Enable RLS on player_wager_slots (Supabase linter: rls_disabled_in_public)
-- Run this in Supabase SQL Editor or via migration
-- See: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public

ALTER TABLE public.player_wager_slots ENABLE ROW LEVEL SECURITY;

-- Policy consistent with other tables (games, players, questions, player_answers)
CREATE POLICY "Allow all operations on player_wager_slots"
  ON public.player_wager_slots
  FOR ALL
  USING (true)
  WITH CHECK (true);
