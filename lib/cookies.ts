// Cookie utilities for persistent player identification

const PERSISTENT_PLAYER_ID_COOKIE = "trivia_persistent_player_id";
const COOKIE_EXPIRY_DAYS = 365; // 1 year

/**
 * Get a persistent player ID from cookie, or generate and store a new one
 */
export function getOrCreatePersistentPlayerId(): string {
  if (typeof window === "undefined") return "";
  
  // Try to get existing cookie
  const existingId = getCookie(PERSISTENT_PLAYER_ID_COOKIE);
  if (existingId) {
    return existingId;
  }
  
  // Generate new UUID
  const newId = generateUUID();
  setCookie(PERSISTENT_PLAYER_ID_COOKIE, newId, COOKIE_EXPIRY_DAYS);
  return newId;
}

/**
 * Get persistent player ID if it exists
 */
export function getPersistentPlayerId(): string | null {
  if (typeof window === "undefined") return null;
  return getCookie(PERSISTENT_PLAYER_ID_COOKIE);
}

/**
 * Store a mapping of persistent player ID + game code -> player ID
 */
export function storePlayerMapping(persistentPlayerId: string, gameCode: string, playerId: string) {
  if (typeof window === "undefined") return;
  
  try {
    const key = `player_mapping_${persistentPlayerId}_${gameCode}`;
    localStorage.setItem(key, playerId);
    
    // Also store in a lookup object for easier retrieval
    const mappings = getPlayerMappings();
    mappings[`${persistentPlayerId}_${gameCode}`] = playerId;
    localStorage.setItem("trivia_player_mappings", JSON.stringify(mappings));
  } catch (error) {
    console.error("Failed to store player mapping:", error);
  }
}

/**
 * Get player ID for a persistent player ID and game code
 */
export function getPlayerIdForGame(persistentPlayerId: string, gameCode: string): string | null {
  if (typeof window === "undefined") return null;
  
  try {
    // Try direct lookup first
    const key = `player_mapping_${persistentPlayerId}_${gameCode}`;
    const playerId = localStorage.getItem(key);
    if (playerId) return playerId;
    
    // Try lookup object
    const mappings = getPlayerMappings();
    return mappings[`${persistentPlayerId}_${gameCode}`] || null;
  } catch (error) {
    console.error("Failed to get player ID:", error);
    return null;
  }
}

/**
 * Get all player mappings
 */
function getPlayerMappings(): Record<string, string> {
  if (typeof window === "undefined") return {};
  
  try {
    const stored = localStorage.getItem("trivia_player_mappings");
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    return {};
  }
}

/**
 * Get all player mappings (exported for use in join page)
 */
export function getAllPlayerMappings(): Record<string, string> {
  return getPlayerMappings();
}

/**
 * Clear player mapping for a specific game
 */
export function clearPlayerMapping(persistentPlayerId: string, gameCode: string) {
  if (typeof window === "undefined") return;
  
  try {
    const key = `player_mapping_${persistentPlayerId}_${gameCode}`;
    localStorage.removeItem(key);
    
    const mappings = getPlayerMappings();
    delete mappings[`${persistentPlayerId}_${gameCode}`];
    localStorage.setItem("trivia_player_mappings", JSON.stringify(mappings));
  } catch (error) {
    console.error("Failed to clear player mapping:", error);
  }
}

// Cookie helper functions
function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function generateUUID(): string {
  // Generate a simple UUID v4
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

