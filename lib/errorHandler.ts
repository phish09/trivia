/**
 * Centralized error handling utilities
 * Provides consistent error handling across the application
 */

export interface AppError {
  message: string;
  code?: string;
  details?: unknown;
  userFriendly?: boolean;
}

export class TriviaError extends Error {
  code?: string;
  details?: unknown;
  userFriendly: boolean;

  constructor(message: string, code?: string, details?: unknown, userFriendly = false) {
    super(message);
    this.name = "TriviaError";
    this.code = code;
    this.details = details;
    this.userFriendly = userFriendly;
  }
}

/**
 * Normalize errors to a consistent format
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof TriviaError) {
    return {
      message: error.message,
      code: error.code,
      details: error.details,
      userFriendly: error.userFriendly,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: error.name,
      details: error,
      userFriendly: false,
    };
  }

  if (typeof error === "string") {
    return {
      message: error,
      userFriendly: false,
    };
  }

  return {
    message: "An unexpected error occurred",
    details: error,
    userFriendly: false,
  };
}

/**
 * Check if error is a network/fetch error
 */
export function isNetworkError(error: unknown): boolean {
  const normalized = normalizeError(error);
  const message = normalized.message.toLowerCase();
  
  return (
    error instanceof TypeError ||
    message.includes("fetch failed") ||
    message.includes("failed to fetch") ||
    message.includes("network error") ||
    normalized.code === "TypeError"
  );
}

/**
 * Check if error indicates a missing resource (game not found, player not found, etc.)
 */
export function isNotFoundError(error: unknown): boolean {
  const normalized = normalizeError(error);
  const message = normalized.message.toLowerCase();
  
  return (
    message.includes("not found") ||
    message.includes("does not exist") ||
    message.includes("player not found") ||
    message.includes("game not found")
  );
}

/**
 * Check if error indicates session/auth issues
 */
export function isSessionError(error: unknown): boolean {
  const normalized = normalizeError(error);
  const message = normalized.message.toLowerCase();
  
  return (
    message.includes("session") ||
    message.includes("expired") ||
    message.includes("unauthorized") ||
    message.includes("rejoin")
  );
}

/**
 * Create a user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  const normalized = normalizeError(error);
  
  if (normalized.userFriendly) {
    return normalized.message;
  }

  if (isNetworkError(error)) {
    return "Unable to connect to the server. Please check your internet connection and try again.";
  }

  if (isNotFoundError(error)) {
    return normalized.message || "The requested resource was not found.";
  }

  if (isSessionError(error)) {
    return "Your session has expired. Please refresh the page or rejoin the game.";
  }

  // Return the error message if it exists, otherwise a generic message
  return normalized.message || "An unexpected error occurred. Please try again.";
}

/**
 * Log error with context
 */
export function logError(error: unknown, context?: string): void {
  const normalized = normalizeError(error);
  
  console.error(`[${context || "Error"}]`, {
    message: normalized.message,
    code: normalized.code,
    details: normalized.details,
  });
}

/**
 * Create a TriviaError for common scenarios
 */
export function createError(
  message: string,
  code?: string,
  userFriendly = false
): TriviaError {
  return new TriviaError(message, code, undefined, userFriendly);
}
