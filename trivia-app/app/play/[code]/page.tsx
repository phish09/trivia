"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { getGame, submitAnswer, verifyPlayerSession, leaveGame } from "../../actions";
import { getSessionForGame, saveSession, clearSession } from "@/lib/session";

function PlayPageContent() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const [game, setGame] = useState<any>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [leaving, setLeaving] = useState(false);

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
            setSelectedAnswer(playerAnswer.answerIndex);
            setSubmitted(true);
          } else {
            setSelectedAnswer(null);
            setSubmitted(false);
          }
        } else {
          // Question doesn't exist yet, reset state
          setSelectedAnswer(null);
          setSubmitted(false);
        }
      } else {
        // No active question, reset state
        setSelectedAnswer(null);
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
    const shouldPoll = 
      !hasActiveQuestion || // Waiting for question to start
      (hasActiveQuestion && submitted && !game.answersRevealed) || // Waiting for answers to be revealed
      (hasActiveQuestion && game.answersRevealed) || // Waiting for next question
      (hasActiveQuestion && !submitted); // Active question, player hasn't answered yet (catch new questions)

    if (shouldPoll) {
      // Poll every 3 seconds when waiting for host actions
      const interval = setInterval(loadGame, 3000);
      return () => clearInterval(interval);
    }
  }, [playerId, verifying, game, submitted]);

  async function handleAnswerSelect(answerIndex: number) {
    if (submitted || !game || !playerId) return;
    setSelectedAnswer(answerIndex);
  }

  async function handleSubmitAnswer() {
    if (selectedAnswer === null || !game || !playerId || submitted) return;
    
    const currentQuestion = game.questions[game.currentQuestionIndex];
    if (!currentQuestion) return;

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
      await submitAnswer(playerId, currentQuestion.id, selectedAnswer);
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
    return <div className="p-8">Loading...</div>;
  }

  // No active question
  if (game.currentQuestionIndex === null || game.currentQuestionIndex === undefined) {
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
        <p className="text-gray-600">Waiting for host to start a question...</p>
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
    const isCorrect = playerAnswer?.isCorrect || false;
    const pointsEarned = playerAnswer?.pointsEarned || 0;

    return (
      <div className="p-8">
        <div className="mb-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Game Code: {code}</h1>
          <div className="flex items-center gap-2">
            {currentPlayer && (
              <div className="text-lg">
                <span className="font-semibold">Your Score: {currentPlayer.score || 0}</span>
              </div>
            )}
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

        <div className="border p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">{currentQuestion.text}</h2>
          
          {playerAnswer ? (
            <div className="mb-4">
              <p className={`text-lg font-semibold mb-2 ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
              </p>
              <p className="text-gray-600 mb-2">
                Your answer: {currentQuestion.choices[playerAnswer.answerIndex]}
              </p>
              <p className="text-green-600 font-semibold">
                Correct answer: {currentQuestion.choices[currentQuestion.answer]}
              </p>
              {pointsEarned > 0 && (
                <p className="text-blue-600 font-semibold mt-2">
                  Points earned: {pointsEarned}
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-600 mb-4">You didn't submit an answer for this question.</p>
          )}

          <div className="space-y-2 mb-4">
            {currentQuestion.choices.map((choice: string, idx: number) => (
              <div
                key={idx}
                className={`p-4 border rounded ${
                  idx === currentQuestion.answer
                    ? "bg-green-100 border-green-400"
                    : idx === playerAnswer?.answerIndex
                    ? "bg-red-100 border-red-400"
                    : "bg-gray-50"
                }`}
              >
                {choice}
                {idx === currentQuestion.answer && (
                  <span className="ml-2 text-green-600 font-semibold">✓ Correct</span>
                )}
                {idx === playerAnswer?.answerIndex && idx !== currentQuestion.answer && (
                  <span className="ml-2 text-red-600 font-semibold">Your answer</span>
                )}
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Waiting for host to continue to next question...
          </p>
        </div>

        {/* Scoreboard */}
        <div className="border p-6 rounded-lg bg-blue-50">
          <h2 className="text-xl font-semibold mb-4">Scoreboard</h2>
          <ol className="list-decimal list-inside space-y-2">
            {sortedPlayers.map((player: any) => (
              <li key={player.id} className={`text-lg ${
                player.id === playerId ? "font-bold text-blue-600" : ""
              }`}>
                <span className="font-semibold">{player.username}</span>: {player.score || 0} points
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  // Active question - players can answer
  return (
    <div className="p-8">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Game Code: {code}</h1>
        <div className="flex items-center gap-2">
          {currentPlayer && (
            <div className="text-lg">
              <span className="font-semibold">Your Score: {currentPlayer.score || 0}</span>
            </div>
          )}
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

      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Question {(game.currentQuestionIndex || 0) + 1} of {game.questions.length}
        </p>
      </div>

      <div className="border p-6 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">{currentQuestion.text}</h2>
        <div className="space-y-3">
          {currentQuestion.choices.map((choice: string, idx: number) => (
            <button
              key={idx}
              className={`w-full text-left p-4 border rounded ${
                selectedAnswer === idx
                  ? "bg-blue-500 text-white border-blue-600"
                  : submitted
                  ? "bg-gray-100 cursor-not-allowed"
                  : "bg-white hover:bg-gray-50"
              }`}
              onClick={() => handleAnswerSelect(idx)}
              disabled={submitted}
            >
              {choice}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Points: {currentQuestion.points} | Multiplier: {currentQuestion.multiplier || 1}x
            {currentQuestion.multiplier > 1 && (
              <span className="ml-1 text-green-600 font-semibold">
                (Max: {currentQuestion.points * (currentQuestion.multiplier || 1)})
              </span>
            )}
          </p>
          {submitted ? (
            <p className="text-gray-600">Answer submitted. Waiting for host to reveal results...</p>
          ) : (
            <button
              className="px-6 py-2 bg-green-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
              onClick={handleSubmitAnswer}
              disabled={selectedAnswer === null}
            >
              Submit Answer
            </button>
          )}
        </div>
      </div>

      {/* Scoreboard */}
      <div className="border p-4 rounded-lg bg-blue-50">
        <h2 className="text-lg font-semibold mb-3">Scoreboard</h2>
        <ol className="list-decimal list-inside space-y-1">
          {sortedPlayers.map((player: any) => (
            <li key={player.id} className={`text-sm ${
              player.id === playerId ? "font-bold text-blue-600" : ""
            }`}>
              <span className="font-semibold">{player.username}</span>: {player.score || 0} points
            </li>
          ))}
        </ol>
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
