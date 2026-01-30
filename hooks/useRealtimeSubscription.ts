import { useEffect, useRef, useCallback } from 'react';
import { getSupabaseClientForRealtime } from '@/lib/db';
import type { Game } from '@/types/game';
import { POLLING_INTERVAL_NORMAL } from '@/lib/constants';

interface UseRealtimeSubscriptionOptions {
  game: Game | null;
  onGameUpdate: () => void; // Callback when game data should be reloaded
  enablePolling?: boolean; // Enable polling as fallback (default: true)
}

/**
 * Custom hook for Supabase Realtime subscriptions
 * Subscribes to game, player, and answer changes
 */
export function useRealtimeSubscription({
  game,
  onGameUpdate,
  enablePolling = true,
}: UseRealtimeSubscriptionOptions) {
  // Debounce update calls to prevent excessive renders
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const DEBOUNCE_MS_NORMAL = 500; // For player answers (less critical)
  const DEBOUNCE_MS_FAST = 100; // For game state changes (host actions - more critical)

  const debouncedUpdate = useCallback((isGameStateChange = false) => {
    const now = Date.now();
    const debounceMs = isGameStateChange ? DEBOUNCE_MS_FAST : DEBOUNCE_MS_NORMAL;
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    if (timeSinceLastUpdate < debounceMs) {
      // Schedule update after debounce period
      updateTimeoutRef.current = setTimeout(() => {
        lastUpdateTimeRef.current = Date.now();
        onGameUpdate();
      }, debounceMs - timeSinceLastUpdate);
    } else {
      // Update immediately if enough time has passed
      lastUpdateTimeRef.current = now;
      onGameUpdate();
    }
  }, [onGameUpdate]);

  useEffect(() => {
    if (!game?.id) return;

    const supabase = getSupabaseClientForRealtime();

    // Get question IDs for client-side filtering
    // Note: Supabase Realtime doesn't support IN operator, so we filter client-side
    const questionIds = game.questions && game.questions.length > 0
      ? new Set(game.questions.map((q) => q.id))
      : new Set<string>();

    // Subscribe to changes in the games table for this specific game
    const channel = supabase
      .channel(`game-${game.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${game.id}`,
        },
        () => {
          // Game state changed (host actions) - use faster debounce for responsiveness
          debouncedUpdate(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'player_answers',
          // No filter - Supabase Realtime doesn't support IN operator
          // We'll filter client-side in the callback
        },
        (payload) => {
          // Filter client-side: only reload if this answer is for one of our questions
          const questionId = (payload.new as any)?.question_id || (payload.old as any)?.question_id;
          
          if (questionId && (questionIds.size === 0 || questionIds.has(questionId))) {
            // Player answer changed - use normal debounce (less critical than host actions)
            debouncedUpdate(false);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `game_id=eq.${game.id}`,
        },
        () => {
          // Players changed (joined/left) - use normal debounce
          debouncedUpdate(false);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime subscription active');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Realtime subscription error, falling back to polling');
        }
      });

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [game?.id, game?.questions, debouncedUpdate]);

  // Poll for updates as fallback (when there's an active question)
  // This ensures fill-in-the-blank and all answer types update automatically
  useEffect(() => {
    if (!game || !enablePolling) return;

    const hasActiveQuestion = game.currentQuestionIndex !== null && game.currentQuestionIndex !== undefined;
    const shouldPoll = hasActiveQuestion && !game.answersRevealed;

    if (shouldPoll) {
      // Poll every 5 seconds as fallback (reduced from 2.5s for 50% egress reduction)
      // Realtime handles most updates instantly; polling is just a safety net
      // This catches any answers that realtime might miss, including fill-in-the-blank
      const POLL_INTERVAL = 5000; // 5 seconds
      const interval = setInterval(() => {
        debouncedUpdate(false);
      }, POLL_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [game, enablePolling, debouncedUpdate]);
}
