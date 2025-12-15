"use client";

import { useState } from "react";
import { createGame } from "../actions";
import { useRouter } from "next/navigation";

export default function HostPage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCreate() {
    if (!name) return;
    setError(null);
    setLoading(true);
    try {
      const game = await createGame(name, password.trim() || undefined);
      // Store password in sessionStorage for this game
      if (password.trim()) {
        sessionStorage.setItem(`host_password_${game.code}`, password.trim());
      }
      router.push(`/host/${game.code}`);
    } catch (err: any) {
      console.error("Failed to create game:", err);
      setError(err?.message || "Failed to create game. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Host a game
          </h1>
          <p className="text-white">Create your trivia game and invite players</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg animate-shake">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-semibold text-red-800 mb-1">Error</p>
                  <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Your name
              </label>
              <input
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleCreate()}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Host password
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                placeholder="Set a password to protect host controls"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleCreate()}
              />
              <p className="text-xs text-slate-500 mt-1">
                This password protects the host interface. Players joining the game don't need it.
              </p>
            </div>

            <button
              className="w-full px-6 py-3 bg-gradient-to-r from-secondary to-tertiary text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              onClick={handleCreate}
              disabled={loading || !name.trim()}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  Create game
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
