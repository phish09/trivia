import { useEffect, useState, useRef } from 'react';
import type { Game } from '@/types/game';
import { POLLING_INTERVAL_FAST } from '@/lib/constants';

interface UseTimerOptions {
  game: Game | null;
  submitted?: boolean; // For player side - stop timer when answer submitted
  onExpire?: () => void; // Callback when timer reaches 0
}

/**
 * Custom hook for managing question timer countdown
 * Handles server-side timer synchronization and client-side countdown
 */
export function useTimer({ game, submitted = false, onExpire }: UseTimerOptions) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const currentQuestionIdRef = useRef<string | null>(null);
  const previousQuestionStartTimeRef = useRef<string | null>(null);
  const timerInitializedRef = useRef<boolean>(false);

  // Initialize timer when question changes or starts
  useEffect(() => {
    if (!game || game.currentQuestionIndex === null || game.currentQuestionIndex === undefined) {
      setTimeRemaining(null);
      currentQuestionIdRef.current = null;
      previousQuestionStartTimeRef.current = null;
      timerInitializedRef.current = false;
      return;
    }

    const currentQuestion = game.questions?.[game.currentQuestionIndex];
    if (!currentQuestion || !currentQuestion.hasTimer || game.answersRevealed) {
      setTimeRemaining(null);
      currentQuestionIdRef.current = null;
      previousQuestionStartTimeRef.current = null;
      timerInitializedRef.current = false;
      return;
    }

    // Timer continues even after submission - players can see the countdown
    // No need to stop timer when submitted

    // Check if question changed
    const questionChanged = currentQuestionIdRef.current !== currentQuestion.id;
    // Check if questionStartTime changed (question was reactivated)
    const startTimeChanged = game.questionStartTime !== previousQuestionStartTimeRef.current;

    // Update refs AFTER checking for changes
    if (questionChanged) {
      currentQuestionIdRef.current = currentQuestion.id;
      timerInitializedRef.current = false;
      previousQuestionStartTimeRef.current = null;
    }

    // If we have questionStartTime and timer should be active, initialize/sync
    if (game.questionStartTime && currentQuestion.hasTimer && currentQuestion.timerSeconds) {
      // Initialize if question changed, start time changed, or not yet initialized
      if (questionChanged || startTimeChanged || !timerInitializedRef.current) {
        timerInitializedRef.current = true;

        // Use server-calculated time if available, otherwise calculate client-side
        if (game.timeRemaining !== null && game.timeRemaining !== undefined) {
          setTimeRemaining(game.timeRemaining);
        } else {
          // Calculate client-side from question_start_time
          const startTimeStr = game.questionStartTime;
          if (!startTimeStr) {
            setTimeRemaining(null);
            return;
          }

          const startTime = new Date(startTimeStr).getTime();
          if (isNaN(startTime)) {
            console.error('[Timer] Invalid questionStartTime:', startTimeStr);
            setTimeRemaining(null);
            return;
          }

          const now = Date.now();
          const elapsed = Math.floor((now - startTime) / 1000);
          const remaining = Math.max(0, currentQuestion.timerSeconds - elapsed);
          setTimeRemaining(remaining);
        }
      } else {
        // Question hasn't changed but sync with server time if available
        if (game.timeRemaining !== null && game.timeRemaining !== undefined) {
          setTimeRemaining(game.timeRemaining);
        }
      }

      // Update the ref AFTER initializing
      previousQuestionStartTimeRef.current = game.questionStartTime;
    } else if (!game.questionStartTime) {
      // No start time yet - wait for it to be set
      setTimeRemaining(null);
      timerInitializedRef.current = false;
      previousQuestionStartTimeRef.current = null;
    } else {
      // Question doesn't have timer - clear it
      setTimeRemaining(null);
      timerInitializedRef.current = false;
      previousQuestionStartTimeRef.current = null;
    }
  }, [
    game?.timeRemaining,
    game?.currentQuestionIndex,
    game?.answersRevealed,
    game?.questionStartTime,
    submitted,
  ]);

  // Countdown interval - syncs with server and decrements
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) {
      if (timeRemaining === 0 && onExpire) {
        onExpire();
      }
      return;
    }

    // Sync with server every 2 seconds to keep in sync
    const syncInterval = setInterval(() => {
      if (game?.timeRemaining !== null && game?.timeRemaining !== undefined) {
        // Always sync with server - it's the source of truth
        setTimeRemaining(game.timeRemaining);
      } else if (
        game?.questionStartTime &&
        game?.questions?.[game.currentQuestionIndex || 0]?.hasTimer
      ) {
        // Fallback: recalculate from question_start_time
        const currentQuestion = game.questions[game.currentQuestionIndex || 0];
        const timerSeconds = currentQuestion?.timerSeconds;
        if (timerSeconds) {
          const startTimeStr = game.questionStartTime;
          if (startTimeStr) {
            const startTime = new Date(startTimeStr).getTime();
            if (!isNaN(startTime)) {
              const now = Date.now();
              const elapsed = Math.floor((now - startTime) / 1000);
              const remaining = Math.max(0, timerSeconds - elapsed);
              setTimeRemaining(remaining);
            }
          }
        }
      }
    }, POLLING_INTERVAL_FAST); // Sync every 2 seconds

    // Countdown interval - decrement every second
    const countdownInterval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev !== null && prev > 0) {
          return prev - 1;
        }
        return prev;
      });
    }, 1000);

    return () => {
      clearInterval(syncInterval);
      clearInterval(countdownInterval);
    };
  }, [timeRemaining, game?.timeRemaining, game?.questionStartTime, game?.currentQuestionIndex, onExpire]);

  return timeRemaining;
}
