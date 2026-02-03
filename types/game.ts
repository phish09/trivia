/**
 * Type definitions for the trivia game application
 */

export interface Question {
  id: string;
  text: string;
  choices: string[];
  answer: number;
  points: number;
  multiplier: number;
  gameId: string;
  questionOrder: number;
  isFillInBlank: boolean;
  isTrueFalse: boolean;
  hasTimer: boolean;
  timerSeconds: number | null;
  fillInBlankAnswer: string | null;
  hasWager: boolean;
  maxWager: number | null;
  roundNumber: number | null;
  isBonus: boolean;
  source: string | null;
}

export interface QuestionInput {
  text: string;
  choices: string[];
  answer: number;
  points: number;
  multiplier: number;
  isFillInBlank?: boolean;
  isTrueFalse?: boolean;
  hasTimer?: boolean;
  timerSeconds?: number;
  fillInBlankAnswer?: string;
  hasWager?: boolean;
  maxWager?: number;
  roundNumber?: number | null;
  isBonus?: boolean;
  source?: string;
}

export interface Player {
  id: string;
  username: string;
  score: number;
  gameId: string;
}

export interface PlayerAnswer {
  playerId: string;
  questionId: string;
  answerIndex: number | null;
  textAnswer: string | null;
  isCorrect: boolean;
  pointsEarned: number;
  manuallyScored: boolean;
  wager: number | null;
  wagerSlot: number | null;
  playerRound: number | null;
}

export type GameType = 'traditional' | 'wager';

export interface Game {
  id: string;
  code: string;
  hostName: string;
  hostPassword: string | null;
  createdAt: string;
  lastActivity: string;
  gameStarted: boolean;
  currentQuestionIndex: number | null;
  answersRevealed: boolean;
  gameEnded: boolean;
  timeRemaining: number | null;
  questionStartTime: string | null;
  gameType: GameType;
  wagerAmounts: number[];
  bonusMaxWager: number;
  questions: Question[];
  players: Player[];
  playerAnswers: PlayerAnswer[];
}

export interface CreateGameResult {
  id: string;
  code: string;
  host_name: string;
  host_password: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface JoinGameResult {
  id: string;
  username: string;
  game_id: string;
}

export interface ImportQuestionsResult {
  success: boolean;
  imported: number;
  errors: string[];
  warnings?: string;
}

export interface DatabaseQuestion {
  id: string;
  text: string;
  choices: string[];
  answer: number;
  points: number;
  multiplier: number | null;
  game_id: string;
  question_order: number | null;
  is_fill_in_blank: boolean;
  is_true_false: boolean;
  has_timer: boolean;
  timer_seconds: number | null;
  fill_in_blank_answer: string | null;
  has_wager: boolean;
  max_wager: number | null;
  round_number: number | null;
  is_bonus: boolean;
  source: string | null;
  created_at?: string;
}

export interface DatabasePlayer {
  id: string;
  username: string;
  score: number | null;
  game_id: string;
  [key: string]: unknown;
}

export interface DatabasePlayerAnswer {
  id?: string;
  player_id: string;
  question_id: string;
  answer_index: number | null;
  text_answer: string | null;
  is_correct: boolean | null;
  points_earned: number | null;
  manually_scored: boolean | null;
  wager: number | null;
  wager_slot: number | null;
  player_round: number | null;
  [key: string]: unknown;
}

export interface DatabaseGame {
  id: string;
  code: string;
  host_name: string;
  host_password: string | null;
  created_at: string;
  last_activity: string | null;
  game_started: boolean | null;
  current_question_index: number | null;
  answers_revealed: boolean | null;
  game_ended: boolean | null;
  question_start_time: string | null;
  game_type: string | null;
  wager_amounts: number[] | null;
  bonus_max_wager: number | null;
  players?: DatabasePlayer[];
  questions?: DatabaseQuestion[];
  [key: string]: unknown;
}
