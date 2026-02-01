"use client";

import { MAX_PLAYERS_PER_GAME } from "@/lib/constants";

interface Player {
  id: string;
  username: string;
  score: number;
}

interface PlayerManagementProps {
  players: Player[];
  minimized: boolean;
  onToggleMinimize: () => void;
  onKickPlayer: (playerId: string, username: string) => void;
}

export default function PlayerManagement({
  players,
  minimized,
  onToggleMinimize,
  onKickPlayer,
}: PlayerManagementProps) {
  // Sort players by score (descending)
  const sortedPlayers = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-800">Players</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${
            players.length >= MAX_PLAYERS_PER_GAME 
              ? 'bg-red-100 text-red-700' 
              : players.length >= MAX_PLAYERS_PER_GAME * 0.8
              ? 'bg-amber-100 text-amber-700'
              : 'bg-purple-100 text-purple-700'
          }`}>
            {players.length} / {MAX_PLAYERS_PER_GAME}
          </span>
        </div>
        <button
          onClick={onToggleMinimize}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title={minimized ? "Expand" : "Minimize"}
        >
          <svg className={`w-5 h-5 text-slate-600 transition-transform ${minimized ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
      {!minimized && (
        <>
          {players.length === 0 ? (
            <div className="text-center py-8 text-slate-500 mt-6">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="font-medium">No players joined yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
              {sortedPlayers.map((player) => (
                <div key={player.id} className="flex justify-between border border-b-4 border-slate-300 items-center p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl hover:border-slate-800 transition-all group">
                  <span className="font-semibold text-slate-800">{player.username}</span>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold text-sm">
                      {player.score || 0} pts
                    </span>
                    <button
                      onClick={() => onKickPlayer(player.id, player.username)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all opacity-60 hover:opacity-100"
                      title={`Kick ${player.username}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
