import { SESSION_EXPIRY_MS, STORAGE_KEYS } from "./constants";

export interface GameSession {
  playerId: string;
  gameCode: string;
  username: string;
  timestamp: number;
}

const SESSION_KEY = STORAGE_KEYS.SESSION;

export function saveSession(session: GameSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      ...session,
      timestamp: Date.now(),
    }));
  } catch (error) {
    console.error("Failed to save session:", error);
  }
}

export function getSession(): GameSession | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;

    const session: GameSession = JSON.parse(stored);
    
    // Check if session is expired
    if (Date.now() - session.timestamp > SESSION_EXPIRY_MS) {
      clearSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error("Failed to get session:", error);
    return null;
  }
}

export function getSessionForGame(gameCode: string): GameSession | null {
  const session = getSession();
  if (session && session.gameCode === gameCode) {
    return session;
  }
  return null;
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
    // Also clear old playerId keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEYS.PLAYER_ID_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error("Failed to clear session:", error);
  }
}

export function updateSessionGameCode(gameCode: string) {
  const session = getSession();
  if (session) {
    saveSession({
      ...session,
      gameCode,
    });
  }
}

/**
 * Get all sessions (for checking any existing session)
 */
export function getAllSessions(): GameSession[] {
  const session = getSession();
  if (session) {
    return [session];
  }
  return [];
}