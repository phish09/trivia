"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { getGame, submitAnswer, verifyPlayerSession, leaveGame } from "../../actions";
import { getSessionForGame, saveSession, clearSession } from "@/lib/session";

function PlayPageContent() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const [game, setGame] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState<string>("");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const currentQuestionIdRef = useRef<string | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    async function restoreSession() {
      try {
        // First check for session
        let session = getSessionForGame(code);
        let pid: string | null = null;

        if (session) {
          // Verify session is still valid
          const player = await verifyPlayerSession(session.playerId, code);
          if (player) {
            pid = session.playerId;
            // Update session timestamp
            saveSession({
              ...session,
              timestamp: Date.now(),
            });
          } else {
            // Session invalid, clear it
            clearSession();
          }
        }

        // Fallback to old localStorage method for backward compatibility
        if (!pid) {
          pid = localStorage.getItem(`playerId_${code}`);
          if (pid) {
            // Verify this player still exists
            const player = await verifyPlayerSession(pid, code);
            if (player) {
              // Create new session from old data
              saveSession({
                playerId: pid,
                gameCode: code,
                username: player.username,
                timestamp: Date.now(),
              });
            } else {
              // Invalid, clear it
              localStorage.removeItem(`playerId_${code}`);
              pid = null;
            }
          }
        }

        if (!pid) {
          // No valid session, redirect to join
          window.location.href = `/join?code=${code}`;
          return;
        }

        setPlayerId(pid);
        setVerifying(false);
      } catch (error) {
        console.error("Failed to restore session:", error);
        clearSession();
        window.location.href = `/join?code=${code}`;
      }
    }
    
    restoreSession();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [code]);

  async function loadGame() {
    if (!playerId) return;
    
    try {
      const gameData = await getGame(code);
      
      // Check if question changed (to reset submitted state)
      const previousQuestionIndex = game?.currentQuestionIndex;
      const newQuestionIndex = gameData.currentQuestionIndex;
      const questionChanged = previousQuestionIndex !== newQuestionIndex;
      
      // Reset timer when question changes
      if (questionChanged) {
        setQuestionStartTime(null);
        setTimeRemaining(null);
      }
      
      setGame(gameData);
      
      // Verify player still exists in the game
      const playerExists = gameData.players.some((p: any) => p.id === playerId);
      if (!playerExists) {
        // Player was removed, clear session and redirect
        clearSession();
        localStorage.removeItem(`playerId_${code}`);
        router.push(`/join?code=${code}`);
        return;
      }
      
      // Check if player has already submitted answer for current question
      if (gameData.currentQuestionIndex !== null && gameData.currentQuestionIndex !== undefined) {
        const currentQuestion = gameData.questions[gameData.currentQuestionIndex];
        if (currentQuestion) {
          const playerAnswer = gameData.playerAnswers?.find(
            (pa: any) => pa.playerId === playerId && pa.questionId === currentQuestion.id
          );
          if (playerAnswer) {
            // Player has submitted, use their submitted answer
            if (currentQuestion.isFillInBlank) {
              setTextAnswer(playerAnswer.textAnswer || "");
            } else {
              setSelectedAnswer(playerAnswer.answerIndex);
            }
            setSubmitted(true);
          } else {
            // Player hasn't submitted yet
            // Only reset if question changed (to preserve selection if same question)
            if (questionChanged) {
              if (currentQuestion.isFillInBlank) {
                setTextAnswer("");
              } else {
                setSelectedAnswer(null);
              }
              setSubmitted(false);
            }
            // Otherwise, preserve the current answer state
            // Don't reset it on every poll to prevent deselection
          }
        } else {
          // Question doesn't exist yet, reset state
          setSelectedAnswer(null);
          setTextAnswer("");
          setSubmitted(false);
        }
      } else {
        // No active question, reset state
        setSelectedAnswer(null);
        setTextAnswer("");
        setSubmitted(false);
      }
    } catch (error: any) {
      console.error("Failed to load game:", error);
      // If game expired or not found, redirect to join
      if (error?.message?.includes("expired") || error?.message?.includes("not found")) {
        clearSession();
        localStorage.removeItem(`playerId_${code}`);
        router.push(`/join?code=${code}`);
      }
    }
  }

  // Load game when playerId is set
  useEffect(() => {
    if (playerId && !verifying) {
      loadGame();
    }
  }, [playerId, verifying]);

  // Poll for updates when waiting for host actions
  useEffect(() => {
    if (!playerId || verifying || !game) return;

    const hasActiveQuestion = game.currentQuestionIndex !== null && game.currentQuestionIndex !== undefined;
    
    // Always poll when:
    // 1. Waiting for host to start a question (no active question)
    // 2. Player has submitted answer and waiting for host to reveal
    // 3. Answers are revealed (waiting for host to move to next question)
    // 4. There's an active question (to catch when host activates a new question)
    // 5. Game has ended (to catch when host ends the game)
    const shouldPoll = 
      !hasActiveQuestion || // Waiting for question to start
      (hasActiveQuestion && submitted && !game.answersRevealed) || // Waiting for answers to be revealed
      (hasActiveQuestion && game.answersRevealed) || // Waiting for next question
      (hasActiveQuestion && !submitted) || // Active question, player hasn't answered yet (catch new questions)
      game.gameEnded; // Game ended, keep polling to show endgame screen

    if (shouldPoll) {
      // Poll every 3 seconds when waiting for host actions
      const interval = setInterval(loadGame, 3000);
      return () => clearInterval(interval);
    }
  }, [playerId, verifying, game, submitted]);

  // Timer countdown logic for player side
  useEffect(() => {
    if (!game || game.currentQuestionIndex === null || game.currentQuestionIndex === undefined || game.answersRevealed) {
      setQuestionStartTime(null);
      setTimeRemaining(null);
      currentQuestionIdRef.current = null;
      return;
    }

    const currentQuestion = game.questions[game.currentQuestionIndex];
    if (!currentQuestion || !currentQuestion.hasTimer || submitted) {
      setQuestionStartTime(null);
      setTimeRemaining(null);
      currentQuestionIdRef.current = null;
      return;
    }

    // Initialize start time when question changes (track by question ID)
    if (currentQuestionIdRef.current !== currentQuestion.id) {
      const startTime = Date.now();
      setQuestionStartTime(startTime);
      setTimeRemaining(currentQuestion.timerSeconds);
      currentQuestionIdRef.current = currentQuestion.id;
    }

    // Update timer every second
    const interval = setInterval(() => {
      setQuestionStartTime((prevStartTime) => {
        if (prevStartTime === null || !currentQuestion.timerSeconds) {
          setTimeRemaining(null);
          return prevStartTime;
        }
        
        const elapsed = Math.floor((Date.now() - prevStartTime) / 1000);
        const remaining = Math.max(0, currentQuestion.timerSeconds - elapsed);
        setTimeRemaining(remaining);

        if (remaining === 0) {
          clearInterval(interval);
        }
        return prevStartTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [game?.currentQuestionIndex ?? null, game?.answersRevealed ?? false, submitted]);

  async function handleAnswerSelect(answerIndex: number) {
    if (submitted || !game || !playerId) return;
    setSelectedAnswer(answerIndex);
  }

  async function handleSubmitAnswer() {
    const currentQuestion = game?.questions[game.currentQuestionIndex];
    if (!game || !playerId || submitted || !currentQuestion) return;
    
    // Check if timer expired
    if (currentQuestion.hasTimer && timeRemaining === 0) {
      return; // Timer expired, don't allow submission
    }
    
    // Validate answer based on question type
    if (currentQuestion.isFillInBlank) {
      if (!textAnswer.trim()) {
        alert("Please enter an answer");
        return;
      }
    } else {
      if (selectedAnswer === null) return;
    }

    // Verify player still exists before submitting
    const playerExists = game.players.some((p: any) => p.id === playerId);
    if (!playerExists) {
      alert("Your player session has expired. Please rejoin the game.");
      clearSession();
      localStorage.removeItem(`playerId_${code}`);
      router.push(`/join?code=${code}`);
      return;
    }

    try {
      if (currentQuestion.isFillInBlank) {
        await submitAnswer(playerId, currentQuestion.id, null, textAnswer.trim());
      } else {
        await submitAnswer(playerId, currentQuestion.id, selectedAnswer);
      }
      setSubmitted(true);
      // Refresh game state after submitting answer
      await loadGame();
    } catch (error: any) {
      console.error("Failed to submit answer:", error);
      const errorMessage = error?.message || "Failed to submit answer. Please try again.";
      
      // If player not found, redirect to join page
      if (errorMessage.includes("Player not found") || errorMessage.includes("rejoin")) {
        alert("Your player session has expired. Redirecting to join page...");
        clearSession();
        localStorage.removeItem(`playerId_${code}`);
        router.push(`/join?code=${code}`);
      } else {
        alert(errorMessage);
      }
    }
  }

  async function handleLeaveGame() {
    if (!playerId || leaving) return;
    
    const confirmed = window.confirm("Are you sure you want to leave the game? Your progress will be lost.");
    if (!confirmed) return;

    setLeaving(true);
    try {
      await leaveGame(playerId);
      // Clear session
      clearSession();
      localStorage.removeItem(`playerId_${code}`);
      // Redirect to home
      router.push("/");
    } catch (error) {
      console.error("Failed to leave game:", error);
      alert("Failed to leave game. Please try again.");
      setLeaving(false);
    }
  }

  if (verifying || !game || !playerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="inline-block p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg mb-4 animate-pulse">
            <svg className="w-12 h-12 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-slate-600 font-medium">Loading game...</p>
        </div>
      </div>
    );
  }

  // Game ended - show endgame screen
  if (game.gameEnded) {
    const sortedPlayers = [...game.players].sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
    const winner = sortedPlayers[0];
    const currentPlayer = game.players.find((p: any) => p.id === playerId);
    
    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200 text-center">
            <div className="inline-block p-4 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl shadow-lg mb-4">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent mb-2">
              Game Over!
            </h1>
            <p className="text-slate-600 text-lg">Thanks for playing!</p>
          </div>

          {/* Winner Card */}
          {winner && (
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl shadow-xl p-8 border-2 border-yellow-300">
              <div className="text-center">
                <div className="inline-block mb-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-4xl">👑</span>
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">
                  {winner.username}
                </h2>
                <p className="text-xl text-slate-600 mb-4">🍗 Winner winner. Chicken dinner. 🍗</p>
                <div className="inline-block px-6 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-xl shadow-lg">
                  <span className="text-2xl font-bold text-white">
                    {winner.score || 0} points
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Final Scoreboard */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Final Scoreboard</h2>
            </div>
            <div className="space-y-3">
              {sortedPlayers.map((player: any, index: number) => (
                <div 
                  key={player.id} 
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    index === 0 
                      ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 shadow-md' 
                      : index === 1 
                        ? 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-300' 
                        : index === 2 
                          ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300' 
                          : 'bg-slate-50 border-slate-200'
                  } ${player.id === playerId ? 'ring-2 ring-blue-400' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0 
                        ? 'bg-yellow-400 text-yellow-900' 
                        : index === 1 
                          ? 'bg-slate-400 text-white' 
                          : index === 2 
                            ? 'bg-orange-400 text-orange-900' 
                            : 'bg-slate-300 text-slate-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <span className={`font-bold text-lg ${
                        player.id === playerId ? 'text-blue-700' : 'text-slate-800'
                      }`}>
                        {player.username} {index === 0 && '👑'}
                        {player.id === playerId && ' (You)'}
                      </span>
                    </div>
                  </div>
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {player.score || 0} pts
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Leave Game Button */}
          <div className="text-center">
            <button
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform transition-all"
              onClick={handleLeaveGame}
              disabled={leaving}
            >
              {leaving ? "Leaving..." : "Leave Game"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No active question
  if (game.currentQuestionIndex === null || game.currentQuestionIndex === undefined) {
    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200 text-center">
            <div className="inline-block p-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-lg mb-6">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Game Code: {code}
            </h1>
            <p className="text-lg text-slate-600 mb-6">Waiting for host to start a question...</p>
            <div className="flex justify-center gap-3">
              <button
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium transition-all shadow-sm"
                onClick={loadGame}
                title="Refresh game data"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </span>
              </button>
              <button
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-all shadow-lg hover:shadow-xl"
                onClick={handleLeaveGame}
                disabled={leaving}
              >
                {leaving ? "Leaving..." : "Leave Game"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = game.questions[game.currentQuestionIndex];
  if (!currentQuestion) {
    return (
      <div className="p-8">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Game Code: {code}</h1>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              onClick={loadGame}
              title="Refresh game data"
            >
              🔄 Refresh
            </button>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
              onClick={handleLeaveGame}
              disabled={leaving}
            >
              {leaving ? "Leaving..." : "Leave Game"}
            </button>
          </div>
        </div>
        <p className="text-gray-600">Waiting for questions...</p>
      </div>
    );
  }

  const currentPlayer = game.players.find((p: any) => p.id === playerId);
  const playerAnswer = game.playerAnswers?.find(
    (pa: any) => pa.playerId === playerId && pa.questionId === currentQuestion.id
  );
  const sortedPlayers = [...game.players].sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

  // Answers revealed - show results and scoreboard
  if (game.answersRevealed) {
    // For fill-in-the-blank questions, isCorrect should be explicitly set by the host
    // If it's null/undefined, default to false (not scored yet)
    const isCorrect = playerAnswer?.isCorrect === true; // Explicitly check for true, not just truthy
    const pointsEarned = playerAnswer?.pointsEarned || 0;

    return (
      <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  Game Code: {code}
                </h1>
                {currentPlayer && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full text-sm font-bold text-blue-700">
                      Your Score: {currentPlayer.score || 0}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium transition-all shadow-sm"
                  onClick={loadGame}
                  title="Refresh game data"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </span>
                </button>
                <button
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-all shadow-lg hover:shadow-xl"
                  onClick={handleLeaveGame}
                  disabled={leaving}
                >
                  {leaving ? "Leaving..." : "Leave Game"}
                </button>
              </div>
            </div>
          </div>

          {/* Results Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">{currentQuestion.text}</h2>
            
            {playerAnswer ? (
              <div className={`mb-6 p-6 rounded-xl border-2 ${
                isCorrect 
                  ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300" 
                  : "bg-gradient-to-r from-red-50 to-pink-50 border-red-300"
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  {isCorrect ? (
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <p className={`text-2xl font-bold ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                      {isCorrect ? "Correct!" : "Incorrect"}
                    </p>
                    {pointsEarned > 0 && (
                      <p className="text-blue-600 font-bold text-lg mt-1">
                        +{pointsEarned} points earned!
                      </p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-slate-700">
                    <span className="font-semibold">Your answer:</span> {currentQuestion.choices[playerAnswer.answerIndex]}
                  </p>
                  <p className="text-green-700 font-semibold">
                    <span className="font-bold">Correct answer:</span> {currentQuestion.choices[currentQuestion.answer]}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-6 p-6 bg-slate-50 rounded-xl border-2 border-slate-200">
                <p className="text-slate-600 font-medium">You didn't submit an answer for this question.</p>
              </div>
            )}

            <div className="space-y-3 mb-6">
              {currentQuestion.choices.map((choice: string, idx: number) => (
                <div
                  key={idx}
                  className={`p-4 border-2 rounded-xl ${
                    idx === currentQuestion.answer
                      ? "bg-green-100 border-green-400"
                      : idx === playerAnswer?.answerIndex
                      ? "bg-red-100 border-red-400"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        idx === currentQuestion.answer ? "bg-green-500 text-white" :
                        idx === playerAnswer?.answerIndex ? "bg-red-500 text-white" :
                        "bg-slate-300 text-slate-600"
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <span className="font-medium">{choice}</span>
                    </div>
                    {idx === currentQuestion.answer && (
                      <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-bold flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Correct
                      </span>
                    )}
                    {idx === playerAnswer?.answerIndex && idx !== currentQuestion.answer && (
                      <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-bold">
                        Your answer
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
              <p className="text-blue-800 font-semibold">
                Waiting for host to continue to next question...
              </p>
            </div>
          </div>

          {/* Scoreboard */}
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-800">Scoreboard</h2>
            </div>
            <div className="space-y-2">
              {sortedPlayers.map((player: any, index: number) => (
                <div 
                  key={player.id} 
                  className={`flex justify-between items-center p-4 rounded-xl ${
                    player.id === playerId 
                      ? "bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300" 
                      : index < 3
                      ? "bg-slate-50 border border-slate-200"
                      : "bg-slate-50 border border-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? "bg-yellow-400 text-yellow-900" :
                      index === 1 ? "bg-slate-400 text-white" :
                      index === 2 ? "bg-orange-400 text-orange-900" :
                      "bg-slate-300 text-slate-700"
                    }`}>
                      {index + 1}
                    </span>
                    <span className={`font-semibold ${player.id === playerId ? "text-blue-700" : "text-slate-700"}`}>
                      {player.username}{index === 0 ? ' 👑' : ''}
                    </span>
                  </div>
                  <span className={`font-bold text-lg ${player.id === playerId ? "text-blue-600" : "text-slate-600"}`}>
                    {player.score || 0} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active question - players can answer
  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Game Code: {code}
              </h1>
              {currentPlayer && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full text-sm font-bold text-blue-700">
                    Your Score: {currentPlayer.score || 0}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium transition-all shadow-sm"
                onClick={loadGame}
                title="Refresh game data"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </span>
              </button>
              <button
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-all shadow-lg hover:shadow-xl"
                onClick={handleLeaveGame}
                disabled={leaving}
              >
                {leaving ? "Leaving..." : "Leave Game"}
              </button>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                Question {(game.currentQuestionIndex || 0) + 1} of {game.questions.length}
              </span>
              <div className="text-sm text-slate-600">
                <span className="font-semibold">{currentQuestion.points} pts</span>
                {currentQuestion.multiplier > 1 && (
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded-full font-bold">
                    {currentQuestion.multiplier}x
                  </span>
                )}
              </div>
            </div>
            {currentQuestion.hasTimer && timeRemaining !== null && !submitted && !game.answersRevealed && (
              <div className={`mb-4 flex items-center justify-center gap-2 p-3 rounded-xl border-2 ${
                timeRemaining === 0 
                  ? 'bg-red-50 border-red-300' 
                  : timeRemaining <= 10 
                    ? 'bg-orange-50 border-orange-200' 
                    : 'bg-orange-50 border-orange-200'
              }`}>
                <svg className={`w-6 h-6 ${timeRemaining === 0 ? 'text-red-600' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {timeRemaining === 0 ? (
                  <span className="text-2xl font-bold text-red-600">Time's Up!</span>
                ) : (
                  <>
                    <span className={`text-2xl font-bold ${timeRemaining <= 10 ? 'text-red-600 animate-pulse' : 'text-orange-600'}`}>
                      {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="text-sm text-slate-600 font-medium">remaining</span>
                  </>
                )}
              </div>
            )}
            <h2 className="text-2xl font-bold text-slate-800 mb-6">{currentQuestion.text}</h2>
          </div>

          {currentQuestion.isFillInBlank ? (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Your Answer</label>
                <textarea
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all resize-none"
                  rows={4}
                  placeholder="Type your answer here..."
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  disabled={submitted}
                />
              </div>
            </div>
          ) : currentQuestion.isTrueFalse ? (
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                className={`p-6 border-2 rounded-xl transition-all ${
                  selectedAnswer === 0
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-600 shadow-lg scale-[1.02]"
                    : submitted
                    ? "bg-slate-100 border-slate-200 cursor-not-allowed opacity-60"
                    : "bg-white border-slate-200 hover:border-green-300 hover:bg-green-50 hover:shadow-md"
                }`}
                onClick={() => handleAnswerSelect(0)}
                disabled={submitted}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl ${
                    selectedAnswer === 0
                      ? "bg-white text-green-600"
                      : "bg-slate-200 text-slate-600"
                  }`}>
                    ✓
                  </div>
                  <span className="font-bold text-xl">True</span>
                  {selectedAnswer === 0 && (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
              <button
                className={`p-6 border-2 rounded-xl transition-all ${
                  selectedAnswer === 1
                    ? "bg-gradient-to-r from-red-500 to-rose-600 text-white border-red-600 shadow-lg scale-[1.02]"
                    : submitted
                    ? "bg-slate-100 border-slate-200 cursor-not-allowed opacity-60"
                    : "bg-white border-slate-200 hover:border-red-300 hover:bg-red-50 hover:shadow-md"
                }`}
                onClick={() => handleAnswerSelect(1)}
                disabled={submitted}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl ${
                    selectedAnswer === 1
                      ? "bg-white text-red-600"
                      : "bg-slate-200 text-slate-600"
                  }`}>
                    ✗
                  </div>
                  <span className="font-bold text-xl">False</span>
                  {selectedAnswer === 1 && (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {currentQuestion.choices.map((choice: string, idx: number) => (
                <button
                  key={idx}
                  className={`w-full text-left p-5 border-2 rounded-xl transition-all ${
                    selectedAnswer === idx
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600 shadow-lg scale-[1.02]"
                      : submitted
                      ? "bg-slate-100 border-slate-200 cursor-not-allowed opacity-60"
                      : "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md"
                  }`}
                  onClick={() => handleAnswerSelect(idx)}
                  disabled={submitted}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      selectedAnswer === idx ? "bg-white text-blue-600" : "bg-slate-200 text-slate-600"
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="font-medium">{choice}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {submitted ? (
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
              <p className="text-blue-800 font-semibold flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Answer submitted. Waiting for host to reveal results...
              </p>
            </div>
          ) : currentQuestion.hasTimer && timeRemaining === 0 ? (
            <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 text-center">
              <p className="text-red-800 font-bold text-lg flex items-center justify-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Too Slow Loser
              </p>
            </div>
          ) : (
            <button
              className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] transform transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              onClick={handleSubmitAnswer}
              disabled={
                (currentQuestion.hasTimer && timeRemaining === 0) ||
                (currentQuestion.isFillInBlank ? !textAnswer.trim() : selectedAnswer === null)
              }
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Submit Answer
            </button>
          )}
        </div>

        {/* Scoreboard */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800">Scoreboard</h2>
          </div>
          <div className="space-y-2">
            {sortedPlayers.map((player: any, index: number) => (
              <div 
                key={player.id} 
                className={`flex justify-between items-center p-3 rounded-xl ${
                  player.id === playerId 
                    ? "bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300" 
                    : "bg-slate-50 border border-slate-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? "bg-yellow-400 text-yellow-900" :
                    index === 1 ? "bg-slate-400 text-white" :
                    index === 2 ? "bg-orange-400 text-orange-900" :
                    "bg-slate-300 text-slate-700"
                  }`}>
                    {index + 1}
                  </span>
                  <span className={`font-semibold ${player.id === playerId ? "text-blue-700" : "text-slate-700"}`}>
                    {player.username}
                  </span>
                </div>
                <span className={`font-bold ${player.id === playerId ? "text-blue-600" : "text-slate-600"}`}>
                  {player.score || 0} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Game</h1>
        <p>Loading...</p>
      </div>
    }>
      <PlayPageContent />
    </Suspense>
  );
}
