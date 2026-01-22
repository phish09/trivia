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

  // Store loadGame in ref so it can be used in checkPassword
  loadGameRef.current = loadGame;

  // Set up Supabase Realtime subscription for instant updates
  useRealtimeSubscription({
    game,
    onGameUpdate: loadGame,
    enablePolling: true,
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
