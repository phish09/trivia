"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams } from "next/navigation";
import { getGame, addQuestion, activateQuestion, revealAnswers, nextQuestion, resetQuestion, resetGame, endGame } from "../../actions";
import { useRouter } from "next/navigation";

function HostGameContent() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const [game, setGame] = useState<any>(null);
  const [questionText, setQuestionText] = useState("");
  const [choices, setChoices] = useState(["", "", "", ""]);
  const [answer, setAnswer] = useState(0);
  const [points, setPoints] = useState(10);
  const [multiplier, setMultiplier] = useState(1);
  const [ending, setEnding] = useState(false);

  useEffect(() => {
    loadGame();
  }, [code]);

  // Poll for updates when there's an active question waiting for players to answer
  useEffect(() => {
    if (!game) return;

    const hasActiveQuestion = game.currentQuestionIndex !== null && game.currentQuestionIndex !== undefined;
    
    // Poll when there's an active question and answers haven't been revealed yet
    // This allows host to see when players submit answers
    const shouldPoll = hasActiveQuestion && !game.answersRevealed;

    if (shouldPoll) {
      // Poll every 3 seconds to check for new player answers
      const interval = setInterval(loadGame, 3000);
      return () => clearInterval(interval);
    }
  }, [game]);

  async function loadGame() {
    try {
      const gameData = await getGame(code);
      setGame(gameData);
    } catch (error) {
      console.error("Failed to load game:", error);
    }
  }

  async function handleAddQuestion() {
    if (!questionText || choices.some((c) => !c) || !game) return;
    await addQuestion(game.id, {
      text: questionText,
      choices: choices.filter((c) => c),
      answer,
      points,
      multiplier,
    });
    setQuestionText("");
    setChoices(["", "", "", ""]);
    setAnswer(0);
    setPoints(10);
    setMultiplier(1);
    loadGame();
  }

  async function handleActivateQuestion(index: number) {
    if (!game) return;
    await activateQuestion(game.id, index);
    loadGame();
  }

  async function handleRevealAnswers() {
    if (!game || game.currentQuestionIndex === null || game.currentQuestionIndex === undefined) return;
    const currentQuestion = game.questions[game.currentQuestionIndex];
    if (!currentQuestion) return;
    await revealAnswers(game.id, currentQuestion.id);
    loadGame();
  }

  async function handleNextQuestion() {
    if (!game || game.currentQuestionIndex === null || game.currentQuestionIndex === undefined) return;
    const nextIndex = game.currentQuestionIndex + 1;
    if (nextIndex >= game.questions.length) {
      alert("All questions completed!");
      return;
    }
    await nextQuestion(game.id, nextIndex);
    loadGame();
  }

  async function handleResetQuestion(questionId: string) {
    if (!game) return;
    const confirmed = window.confirm("Are you sure you want to reset this question? All answers and points for this question will be removed.");
    if (!confirmed) return;
    
    try {
      await resetQuestion(game.id, questionId);
      loadGame();
    } catch (error) {
      console.error("Failed to reset question:", error);
      alert("Failed to reset question. Please try again.");
    }
  }

  async function handleResetGame() {
    if (!game) return;
    const confirmed = window.confirm("Are you sure you want to reset the entire game? This will:\n- Reset all player scores to 0\n- Clear all answers\n- Reset game state\n\nThis cannot be undone!");
    if (!confirmed) return;
    
    try {
      await resetGame(game.id);
      loadGame();
    } catch (error) {
      console.error("Failed to reset game:", error);
      alert("Failed to reset game. Please try again.");
    }
  }

  async function handleEndGame() {
    if (!game || ending) return;
    const confirmed = window.confirm("Are you sure you want to end the game? This will permanently delete the game and all its data. Players will no longer be able to access it.\n\nThis cannot be undone!");
    if (!confirmed) return;

    setEnding(true);
    try {
      await endGame(game.id);
      // Redirect to home page after ending game
      router.push("/");
    } catch (error) {
      console.error("Failed to end game:", error);
      alert("Failed to end game. Please try again.");
      setEnding(false);
    }
  }

  if (!game) {
    return <div className="p-8">Loading...</div>;
  }

  const currentQuestion = game.currentQuestionIndex !== null && game.currentQuestionIndex !== undefined
    ? game.questions[game.currentQuestionIndex]
    : null;

  const sortedPlayers = [...game.players].sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

  return (
    <div className="p-8">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold mb-4">Host Game</h1>
          <div>
            <p className="text-lg mb-2">Game Code:</p>
            <p className="text-3xl font-bold text-blue-600">{code}</p>
            <p className="text-sm text-gray-600 mt-2">Share this code with players to join</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            onClick={loadGame}
            title="Refresh game data"
          >
            🔄 Refresh
          </button>
          <button
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
            onClick={handleResetGame}
          >
            Reset Game
          </button>
          <button
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
            onClick={handleEndGame}
            disabled={ending}
          >
            {ending ? "Ending..." : "End Game"}
          </button>
        </div>
      </div>

      {/* Current Question Control */}
      {game.questions.length > 0 && (
        <div className="mb-6 border p-4 rounded-lg bg-gray-50">
          <h2 className="text-xl font-semibold mb-4">Game Control</h2>
          {currentQuestion ? (
            <div>
              <p className="mb-2">
                <strong>Current Question:</strong> {(game.currentQuestionIndex || 0) + 1} of {game.questions.length}
              </p>
              <p className="mb-2 font-semibold">{currentQuestion.text}</p>
              
              {/* Answer Status */}
              {!game.answersRevealed && (
                <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
                  <p className="font-semibold mb-2 text-blue-800">
                    Answer Status: {game.playerAnswers?.filter((pa: any) => pa.questionId === currentQuestion.id).length || 0} / {game.players.length} players answered
                  </p>
                  <div className="space-y-1">
                    {game.players.map((player: any) => {
                      const hasAnswered = game.playerAnswers?.some(
                        (pa: any) => pa.playerId === player.id && pa.questionId === currentQuestion.id
                      );
                      return (
                        <div key={player.id} className="flex items-center gap-2 text-sm">
                          <span className={hasAnswered ? "text-green-600" : "text-gray-500"}>
                            {hasAnswered ? "✓" : "○"}
                          </span>
                          <span className={hasAnswered ? "font-semibold text-green-700" : "text-gray-600"}>
                            {player.username}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {!game.answersRevealed ? (
                <button
                  className="px-4 py-2 bg-yellow-600 text-white rounded mr-2"
                  onClick={handleRevealAnswers}
                >
                  Reveal Answers
                </button>
              ) : (
                <div>
                  <p className="mb-2 text-green-600 font-semibold">
                    Correct Answer: {currentQuestion.choices[currentQuestion.answer]}
                  </p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      onClick={handleNextQuestion}
                    >
                      Next Question
                    </button>
                    <span className="text-gray-600">or</span>
                    <select
                      className="px-4 py-2 border rounded bg-white"
                      onChange={(e) => {
                        const selectedIndex = Number(e.target.value);
                        if (selectedIndex >= 0 && selectedIndex < game.questions.length) {
                          handleActivateQuestion(selectedIndex);
                        }
                      }}
                      value=""
                    >
                      <option value="">Jump to Question...</option>
                      {game.questions.map((q: any, idx: number) => (
                        <option key={q.id} value={idx}>
                          Question {idx + 1}: {q.text.substring(0, 50)}{q.text.length > 50 ? "..." : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="mb-2">No question active. Select a question to start:</p>
              <div className="flex flex-wrap gap-2">
                {game.questions.map((q: any, idx: number) => (
                  <button
                    key={q.id}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                    onClick={() => handleActivateQuestion(idx)}
                  >
                    Question {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scoreboard */}
      {game.answersRevealed && (
        <div className="mb-6 border p-4 rounded-lg bg-blue-50">
          <h2 className="text-xl font-semibold mb-4">Scoreboard</h2>
          <ol className="list-decimal list-inside space-y-2">
            {sortedPlayers.map((player: any) => (
              <li key={player.id} className="text-lg">
                <span className="font-semibold">{player.username}</span>: {player.score || 0} points
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Players ({game.players.length})</h2>
        {game.players.length === 0 ? (
          <p className="text-gray-500">No players joined yet</p>
        ) : (
          <ul className="space-y-2">
            {sortedPlayers.map((player: any) => (
              <li key={player.id} className="flex justify-between items-center p-2 border rounded">
                <span className="font-semibold">{player.username}</span>
                <span className="text-blue-600 font-bold">{player.score || 0} points</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Add Question</h2>
        <div className="space-y-4">
          <input
            className="border p-2 w-full"
            placeholder="Question text"
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
          />
          <div className="space-y-2">
            {choices.map((choice, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={answer === idx}
                  onChange={() => setAnswer(idx)}
                />
                <input
                  className="border p-2 flex-1"
                  placeholder={`Choice ${idx + 1}`}
                  value={choice}
                  onChange={(e) => {
                    const newChoices = [...choices];
                    newChoices[idx] = e.target.value;
                    setChoices(newChoices);
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <label>
              Points:
              <input
                type="number"
                className="border p-2 ml-2 w-20"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
              />
            </label>
            <label>
              Multiplier:
              <select
                className="border p-2 ml-2"
                value={multiplier}
                onChange={(e) => setMultiplier(Number(e.target.value))}
              >
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={3}>3x</option>
                <option value={4}>4x</option>
              </select>
            </label>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={handleAddQuestion}
            >
              Add Question
            </button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">Questions ({game.questions.length})</h2>
        {game.questions.length === 0 ? (
          <p className="text-gray-500">No questions added yet</p>
        ) : (
          <ul className="space-y-2">
            {game.questions.map((q: any, idx: number) => (
              <li key={q.id} className={`border p-3 rounded ${
                game.currentQuestionIndex === idx ? "bg-yellow-100 border-yellow-400" : ""
              }`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-semibold">{idx + 1}. {q.text}</p>
                    <p className="text-sm text-gray-600">
                      {q.choices.map((c: string, i: number) => (
                        <span key={i} className={i === q.answer ? "font-bold" : ""}>
                          {i === q.answer ? "✓ " : ""}{c}
                          {i < q.choices.length - 1 ? " | " : ""}
                        </span>
                      ))}
                    </p>
                    <p className="text-sm text-gray-500">
                      Points: {q.points} | Multiplier: {q.multiplier || 1}x 
                      {q.multiplier > 1 && (
                        <span className="ml-1 text-green-600 font-semibold">
                          (Max: {q.points * (q.multiplier || 1)})
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    className="ml-4 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    onClick={() => handleResetQuestion(q.id)}
                    title="Reset this question"
                  >
                    Reset
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function HostGamePage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Host Game</h1>
        <p>Loading...</p>
      </div>
    }>
      <HostGameContent />
    </Suspense>
  );
}
