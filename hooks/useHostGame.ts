import { useState, useEffect, useCallback, useRef } from 'react';
import { getGame, verifyHostPassword } from '@/app/actions';
import { useRealtimeSubscription } from './useRealtimeSubscription';

interface UseHostGameOptions {
  code: string;
}

interface UseHostGameReturn {
  game: any | null;
  passwordPrompt: boolean;
  passwordError: string | null;
  passwordVerified: boolean;
  passwordInput: string;
  setPasswordInput: (value: string) => void;
  setPasswordError: (error: string | null) => void;
  handlePasswordSubmit: () => Promise<void>;
  loadGame: () => Promise<void>;
}

/**
 * Custom hook for managing host game state, password verification, and game loading
 */
export function useHostGame({ code }: UseHostGameOptions): UseHostGameReturn {
  const [game, setGame] = useState<any>(null);
  const [passwordPrompt, setPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordVerified, setPasswordVerified] = useState(false);
  const loadGameRef = useRef<(() => Promise<void>) | null>(null);

  const loadGame = useCallback(async () => {
    try {
      const gameData = await getGame(code);
      setGame(gameData);
    } catch (error) {
      console.error("Failed to load game:", error);
    }
  }, [code]);

  // Incremental update function for player changes
  // Provides instant UI feedback when players join/leave/update
  const updatePlayersIncremental = useCallback((payload: any) => {
    setGame((prevGame: any) => {
      if (!prevGame) return prevGame;
      
      // Supabase realtime payload structure:
      // - eventType: 'INSERT', 'UPDATE', or 'DELETE'
      // - new: new row data (for INSERT/UPDATE)
      // - old: old row data (for UPDATE/DELETE)
      const eventType = payload.eventType;
      const newPlayer = payload.new;
      const oldPlayer = payload.old;
      
      if (eventType === 'INSERT' && newPlayer) {
        // Player joined - add to list if not already present
        const playerExists = prevGame.players?.some((p: any) => p.id === newPlayer.id);
        if (!playerExists) {
          console.log('[Realtime] Player joined:', newPlayer.username);
          return {
            ...prevGame,
            players: [
              ...(prevGame.players || []),
              {
                id: newPlayer.id,
                username: newPlayer.username,
                score: newPlayer.score || 0,
                gameId: newPlayer.game_id,
              },
            ],
          };
        }
      } else if (eventType === 'UPDATE' && newPlayer) {
        // Player updated (e.g., score changed, username changed)
        const playerIndex = prevGame.players?.findIndex((p: any) => p.id === newPlayer.id);
        if (playerIndex !== undefined && playerIndex >= 0) {
          console.log('[Realtime] Player updated:', newPlayer.username, 'score:', newPlayer.score);
          return {
            ...prevGame,
            players: prevGame.players.map((p: any, idx: number) =>
              idx === playerIndex
                ? {
                    ...p,
                    username: newPlayer.username,
                    score: newPlayer.score || 0,
                  }
                : p
            ),
          };
        }
      } else if (eventType === 'DELETE' && oldPlayer) {
        // Player left - remove from list
        console.log('[Realtime] Player left:', oldPlayer.username);
        return {
          ...prevGame,
          players: (prevGame.players || []).filter((p: any) => p.id !== oldPlayer.id),
        };
      }
      
      return prevGame;
    });
  }, []);

  // Store loadGame in ref so it can be used in checkPassword
  loadGameRef.current = loadGame;

  // Set up Supabase Realtime subscription for instant updates
  useRealtimeSubscription({
    game,
    onGameUpdate: loadGame,
    enablePolling: true,
    onPlayerUpdate: updatePlayersIncremental,
  });

  const checkPassword = useCallback(async () => {
    // Check if password is stored in sessionStorage
    const storedPassword = sessionStorage.getItem(`host_password_${code}`);
    if (storedPassword) {
      try {
        const isValid = await verifyHostPassword(code, storedPassword);
        if (isValid) {
          setPasswordVerified(true);
          if (loadGameRef.current) {
            await loadGameRef.current();
          }
          return;
        }
      } catch (error) {
        // Password invalid or game not found, show prompt
      }
    }
    
    // Check if game requires password
    try {
      const gameData = await getGame(code);
      // If game has a password and we haven't verified, show prompt
      if (gameData.hostPassword && !storedPassword) {
        setPasswordPrompt(true);
      } else {
        // No password required or already verified
        setPasswordVerified(true);
        if (loadGameRef.current) {
          await loadGameRef.current();
        }
      }
    } catch (error) {
      // Game not found or error, try to show prompt
      // But first check if we have a stored password
      if (!storedPassword) {
        setPasswordPrompt(true);
      } else {
        // We have stored password but game fetch failed, try loading anyway
        setPasswordVerified(true);
        if (loadGameRef.current) {
          await loadGameRef.current();
        }
      }
    }
  }, [code]);

  async function handlePasswordSubmit() {
    if (!passwordInput.trim()) {
      setPasswordError("Please enter a password");
      return;
    }
    
    try {
      const isValid = await verifyHostPassword(code, passwordInput.trim());
      if (isValid) {
        // Store password in sessionStorage
        sessionStorage.setItem(`host_password_${code}`, passwordInput.trim());
        setPasswordVerified(true);
        setPasswordPrompt(false);
        setPasswordError(null);
        setPasswordInput("");
        await loadGame();
      } else {
        setPasswordError("Invalid password. Please try again.");
      }
    } catch (error: any) {
      console.error("Password verification error:", error);
      setPasswordError(error?.message || "Failed to verify password. Please try again.");
    }
  }

  useEffect(() => {
    checkPassword();
  }, [checkPassword]);

  return {
    game,
    passwordPrompt,
    passwordError,
    passwordVerified,
    passwordInput,
    setPasswordInput,
    setPasswordError,
    handlePasswordSubmit,
    loadGame,
  };
}
