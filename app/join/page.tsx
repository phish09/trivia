"use client";

import { joinGame, verifyPlayerSession } from "../actions";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSessionForGame, saveSession, clearSession } from "@/lib/session";
import { getOrCreatePersistentPlayerId, getPlayerIdForGame, storePlayerMapping, clearPlayerMapping } from "@/lib/cookies";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const codeParam = searchParams.get("code");
    if (codeParam) {
      setCode(codeParam);
      checkExistingSession(codeParam);
    } else {
      setCheckingSession(false);
    }
  }, [searchParams]);

  async function checkExistingSession(gameCode: string) {
    try {
      // First check localStorage session
      const session = getSessionForGame(gameCode);
      if (session) {
        // Verify session is still valid
        const player = await verifyPlayerSession(session.playerId, gameCode);
        if (player) {
          // Session is valid, restore it
          setName(session.username);
          router.push(`/play/${gameCode}`);
          return;
        } else {
          // Session invalid, clear it
          clearSession();
        }
      }
      
      // Check cookie-based persistent player ID
      const persistentPlayerId = getOrCreatePersistentPlayerId();
      const existingPlayerId = getPlayerIdForGame(persistentPlayerId, gameCode);
      
      if (existingPlayerId) {
        // Verify player still exists
        const player = await verifyPlayerSession(existingPlayerId, gameCode);
        if (player) {
          // Restore session from cookie-based mapping
          setName(player.username);
          saveSession({
            playerId: existingPlayerId,
            gameCode: gameCode,
            username: player.username,
            timestamp: Date.now(),
          });
          router.push(`/play/${gameCode}`);
          return;
        } else {
          // Player doesn't exist anymore, clear mapping
          clearPlayerMapping(persistentPlayerId, gameCode);
        }
      }
    } catch (error) {
      console.error("Failed to verify session:", error);
      clearSession();
    } finally {
      setCheckingSession(false);
    }
  }

  async function handleJoin() {
    if (!code || !name.trim() || joining) {
      return;
    }

    setJoining(true);
    try {
      // Get or create persistent player ID from cookie
      const persistentPlayerId = getOrCreatePersistentPlayerId();
      
      // Check if we have an existing player ID for this game
      const existingPlayerId = getPlayerIdForGame(persistentPlayerId, code);
      
      // Join game (will restore existing player if found, or create new one)
      const player = await joinGame(code, name.trim(), existingPlayerId);
      
      // Store the mapping for future sessions
      storePlayerMapping(persistentPlayerId, code, player.id);
      
      // Save session
      saveSession({
        playerId: player.id,
        gameCode: code,
        username: name.trim(),
        timestamp: Date.now(),
      });
      
      // Also store for backward compatibility
      localStorage.setItem(`playerId_${code}`, player.id);
      
      router.push(`/play/${code}`);
    } catch (error: any) {
      setJoining(false); // Re-enable button on error
      alert(error.message || "Failed to join game. Please try again.");
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="inline-block p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg mb-4 animate-pulse">
            <svg className="w-12 h-12 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-slate-600">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
            Join a Game
          </h1>
          <p className="text-slate-600">Enter the game code to start playing</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Game Code
              </label>
              <input
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-center text-2xl font-bold tracking-widest uppercase"
                placeholder="ABCD"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                maxLength={6}
                onKeyDown={(e) => e.key === 'Enter' && !joining && handleJoin()}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Your Username
              </label>
              <input
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !joining && handleJoin()}
              />
            </div>

            <button
              className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transform transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
              onClick={handleJoin}
              disabled={!code || !name.trim() || joining}
            >
              {joining ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Joining...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Join Game
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <h1 className="text-xl mb-4">Join a Game</h1>
        <p>Loading...</p>
      </div>
    }>
      <JoinForm />
    </Suspense>
  );
}
