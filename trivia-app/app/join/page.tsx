"use client";

import { joinGame, verifyPlayerSession } from "../actions";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSessionForGame, saveSession, clearSession } from "@/lib/session";

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

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
    } catch (error) {
      console.error("Failed to verify session:", error);
      clearSession();
    } finally {
      setCheckingSession(false);
    }
  }

  async function handleJoin() {
    if (!code || !name.trim()) {
      alert("Please enter both game code and username");
      return;
    }

    try {
      const player = await joinGame(code, name.trim());
      
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
      alert(error.message || "Failed to join game. Please try again.");
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-xl mb-4">Join a Game</h1>

      <input
        className="border p-2"
        placeholder="Game code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <input
        className="border p-2 ml-2"
        placeholder="Your username"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <button
        className="ml-2 px-4 py-2 bg-green-600 text-white rounded"
        onClick={handleJoin}
      >
        Join
      </button>
    </div>
  );
}
