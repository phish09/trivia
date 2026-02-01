"use client";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

/**
 * Track a custom event in Google Analytics
 */
export function trackEvent(eventName: string, eventParams?: Record<string, any>) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, eventParams);
  }
}

/**
 * Track game creation
 */
export function trackGameCreated(gameType: 'traditional' | 'wager', hasPassword: boolean) {
  trackEvent("game_created", {
    game_type: gameType,
    has_password: hasPassword,
  });
}

/**
 * Track player joining a game (only for new players, not returning)
 */
export function trackPlayerJoined(gameType: 'traditional' | 'wager', isNewPlayer: boolean) {
  if (isNewPlayer) {
    trackEvent("player_joined", {
      game_type: gameType,
    });
  }
}

/**
 * Track question added to a game
 */
export function trackQuestionAdded(
  gameType: 'traditional' | 'wager',
  questionType: 'multiple_choice' | 'true_false' | 'fill_in_blank',
  hasTimer: boolean,
  hasWager: boolean
) {
  trackEvent("question_added", {
    game_type: gameType,
    question_type: questionType,
    has_timer: hasTimer,
    has_wager: hasWager,
  });
}

/**
 * Track game started (first question activated)
 */
export function trackGameStarted(gameType: 'traditional' | 'wager', questionCount: number) {
  trackEvent("game_started", {
    game_type: gameType,
    question_count: questionCount,
  });
}

/**
 * Track game ended
 */
export function trackGameEnded(
  gameType: 'traditional' | 'wager',
  questionCount: number,
  playerCount: number,
  questionsAnswered: number
) {
  trackEvent("game_ended", {
    game_type: gameType,
    question_count: questionCount,
    player_count: playerCount,
    questions_answered: questionsAnswered,
  });
}

/**
 * Track answer submission
 */
export function trackAnswerSubmitted(
  gameType: 'traditional' | 'wager',
  questionType: 'multiple_choice' | 'true_false' | 'fill_in_blank',
  hasWager: boolean
) {
  trackEvent("answer_submitted", {
    game_type: gameType,
    question_type: questionType,
    has_wager: hasWager,
  });
}
