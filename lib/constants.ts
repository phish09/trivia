/**
 * Application-wide constants
 * Centralizes magic numbers and configuration values
 */

// Game expiration and cleanup
export const GAME_EXPIRY_DAYS = 30;
export const GAME_EXPIRY_MS = GAME_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// Session management
export const SESSION_EXPIRY_DAYS = 7;
export const SESSION_EXPIRY_MS = SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// Cookie management
export const COOKIE_EXPIRY_DAYS = 365;

// Polling intervals (in milliseconds)
export const POLLING_INTERVAL_FAST = 2000; // 2 seconds - for game display page
export const POLLING_INTERVAL_NORMAL = 3000; // 3 seconds - for player waiting states

// Timer defaults
export const DEFAULT_TIMER_SECONDS = 30;
export const MIN_TIMER_SECONDS = 1;
export const MAX_TIMER_SECONDS = 999;

// Question defaults
export const DEFAULT_POINTS = 10;
export const DEFAULT_MULTIPLIER = 1;
export const DEFAULT_MAX_WAGER = 10;
export const MAX_CHOICES = 4;

// Question ordering fallback
export const QUESTION_ORDER_FALLBACK = 999999;

// Storage keys
export const STORAGE_KEYS = {
  SESSION: "trivia_game_session",
  SOUND_ENABLED: "trivia_sound_enabled",
  PLAYER_MAPPINGS: "trivia_player_mappings",
  HOST_PASSWORD_PREFIX: "host_password_",
  PLAYER_ID_PREFIX: "playerId_",
  PLAYER_MAPPING_PREFIX: "player_mapping_",
} as const;

// Realtime configuration
export const REALTIME_EVENTS_PER_SECOND = 10;

// Game code generation
export const GAME_CODE_MIN = 10000;
export const GAME_CODE_MAX = 99999;
