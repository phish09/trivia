import { GAME_CODE_MIN, GAME_CODE_MAX } from "./constants";

export function generateGameCode(): string {
  return Math.floor(GAME_CODE_MIN + Math.random() * (GAME_CODE_MAX - GAME_CODE_MIN + 1)).toString();
}

