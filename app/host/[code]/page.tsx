"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useParams } from "next/navigation";
import { getGame, addQuestion, updateQuestion, activateQuestion, revealAnswers, nextQuestion, resetQuestion, resetGame, endGame, reorderQuestions, manuallyAwardPoints, verifyHostPassword } from "../../actions";
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
  const [isFillInBlank, setIsFillInBlank] = useState(false);
  const [hasTimer, setHasTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [ending, setEnding] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editQuestionText, setEditQuestionText] = useState("");
  const [editChoices, setEditChoices] = useState(["", "", "", ""]);
  const [editAnswer, setEditAnswer] = useState(0);
  const [editPoints, setEditPoints] = useState(10);
  const [editMultiplier, setEditMultiplier] = useState(1);
  const [editIsFillInBlank, setEditIsFillInBlank] = useState(false);
  const [editHasTimer, setEditHasTimer] = useState(false);
  const [editTimerSeconds, setEditTimerSeconds] = useState(30);
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const currentQuestionIdRef = useRef<string | null>(null);
  const [passwordPrompt, setPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordVerified, setPasswordVerified] = useState(false);

  useEffect(() => {
    checkPassword();
  }, [code]);

  async function checkPassword() {
    // Check if password is stored in sessionStorage
    const storedPassword = sessionStorage.getItem(`host_password_${code}`);
    if (storedPassword) {
      try {
        const isValid = await verifyHostPassword(code, storedPassword);
        if (isValid) {
          setPasswordVerified(true);
          loadGame();
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
        loadGame();
      }
    } catch (error) {
      // Game not found or error, try to show prompt
      // But first check if we have a stored password
      if (!storedPassword) {
        setPasswordPrompt(true);
      } else {
        // We have stored password but game fetch failed, try loading anyway
        setPasswordVerified(true);
        loadGame();
      }
    }
  }

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
        loadGame();
      } else {
        setPasswordError("Incorrect password. Please try again.");
        setPasswordInput("");
      }
    } catch (error: any) {
      setPasswordError(error?.message || "Failed to verify password. Please try again.");
    }
  }

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

  // Timer countdown logic
  useEffect(() => {
    if (!game || game.currentQuestionIndex === null || game.currentQuestionIndex === undefined) {
      setQuestionStartTime(null);
      setTimeRemaining(null);
      currentQuestionIdRef.current = null;
      return;
    }

    const currentQuestion = game.questions[game.currentQuestionIndex];
    if (!currentQuestion || !currentQuestion.hasTimer || game.answersRevealed) {
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
  }, [game?.currentQuestionIndex ?? null, game?.answersRevealed ?? false]);

  async function loadGame() {
    try {
      const gameData = await getGame(code);
      setGame(gameData);
    } catch (error) {
      console.error("Failed to load game:", error);
    }
  }

  async function handleAddQuestion() {
    if (!questionText || !game) return;
    if (!isFillInBlank && choices.some((c) => !c)) return;
    await addQuestion(game.id, {
      text: questionText,
      choices: isFillInBlank ? [] : choices.filter((c) => c),
      answer: isFillInBlank ? -1 : answer,
      points,
      multiplier,
      isFillInBlank,
      hasTimer,
      timerSeconds: hasTimer ? timerSeconds : undefined,
    });
    setQuestionText("");
    setChoices(["", "", "", ""]);
    setAnswer(0);
    setPoints(10);
    setMultiplier(1);
    setIsFillInBlank(false);
    setHasTimer(false);
    setTimerSeconds(30);
    loadGame();
  }

  function handleStartEdit(question: any) {
    setEditingQuestionId(question.id);
    setEditQuestionText(question.text);
    // Ensure we have 4 choices, pad with empty strings if needed
    const paddedChoices = [...(question.choices || [])];
    while (paddedChoices.length < 4) {
      paddedChoices.push("");
    }
    setEditChoices(paddedChoices.slice(0, 4));
    setEditAnswer(question.answer || 0);
    setEditPoints(question.points);
    setEditMultiplier(question.multiplier || 1);
    setEditIsFillInBlank(question.isFillInBlank || false);
    setEditHasTimer(question.hasTimer || false);
    setEditTimerSeconds(question.timerSeconds || 30);
  }

  function handleCancelEdit() {
    setEditingQuestionId(null);
    setEditQuestionText("");
    setEditChoices(["", "", "", ""]);
    setEditAnswer(0);
    setEditPoints(10);
    setEditMultiplier(1);
    setEditIsFillInBlank(false);
    setEditHasTimer(false);
    setEditTimerSeconds(30);
  }

  async function handleSaveEdit() {
    if (!editingQuestionId || !editQuestionText || !game) return;
    if (!editIsFillInBlank && editChoices.some((c) => !c)) return;
    try {
      await updateQuestion(editingQuestionId, {
        text: editQuestionText,
        choices: editIsFillInBlank ? [] : editChoices.filter((c) => c),
        answer: editIsFillInBlank ? -1 : editAnswer,
        points: editPoints,
        multiplier: editMultiplier,
        isFillInBlank: editIsFillInBlank,
        hasTimer: editHasTimer,
        timerSeconds: editHasTimer ? editTimerSeconds : undefined,
      });
      handleCancelEdit();
      loadGame();
    } catch (error) {
      console.error("Failed to update question:", error);
      alert("Failed to update question. Please try again.");
    }
  }

  function handleDragStart(e: React.DragEvent, questionId: string) {
    setDraggedQuestionId(questionId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", questionId);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  async function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (!draggedQuestionId || !game) return;
    
    const draggedIndex = game.questions.findIndex((q: any) => q.id === draggedQuestionId);
    if (draggedIndex === -1 || draggedIndex === dropIndex) {
      setDraggedQuestionId(null);
      return;
    }

    // Create new ordered array
    const newQuestions = [...game.questions];
    const [draggedQuestion] = newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(dropIndex, 0, draggedQuestion);

    // Update order in database
    try {
      const questionIds = newQuestions.map((q: any) => q.id);
      await reorderQuestions(game.id, questionIds);
      // Reload game to get updated order
      await loadGame();
    } catch (error) {
      console.error("Failed to reorder questions:", error);
      alert("Failed to reorder questions. Please try again.");
    }
    
    setDraggedQuestionId(null);
  }

  function handleDragEnd() {
    setDraggedQuestionId(null);
    setDragOverIndex(null);
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
    // nextQuestion will automatically mark game as ended if there are no more questions
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
    const confirmed = window.confirm("Are you sure you want to end the game? Players will see the final scoreboard.\n\nThe game will be marked as ended.");
    if (!confirmed) return;

    setEnding(true);
    try {
      await endGame(game.id);
      loadGame(); // Reload to show ended state
      setEnding(false);
    } catch (error) {
      console.error("Failed to end game:", error);
      alert("Failed to end game. Please try again.");
      setEnding(false);
    }
  }

  // Show password prompt if password is required and not verified
  if (passwordPrompt && !passwordVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div className="text-center">
              <div className="inline-block p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg mb-4">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-2">Host Password Required</h1>
              <p className="text-slate-600">Enter the password to access host controls for game code: <span className="font-bold text-blue-600">{code}</span></p>
            </div>
            
            {passwordError && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
                <p className="text-sm text-red-700">{passwordError}</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                placeholder="Enter host password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                autoFocus
              />
            </div>
            
            <button
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transform transition-all duration-200 flex items-center justify-center gap-2"
              onClick={handlePasswordSubmit}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Verify Password
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!game || !passwordVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-blue-50">
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

  const currentQuestion = game.currentQuestionIndex !== null && game.currentQuestionIndex !== undefined
    ? game.questions[game.currentQuestionIndex]
    : null;

  const sortedPlayers = [...game.players].sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Game Ended Banner */}
        {game.gameEnded && (
          <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-slate-800 mb-1">Game Ended</h2>
                <p className="text-slate-600">Players can now see the final scoreboard. The winner is <span className="font-bold text-yellow-700">{sortedPlayers[0]?.username || "N/A"}</span> with <span className="font-bold text-yellow-700">{sortedPlayers[0]?.score || 0} points</span>!</p>
              </div>
            </div>
          </div>
        )}

        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Host Game
                </h1>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                <p className="text-sm font-semibold text-slate-600 mb-1">Game Code</p>
                <div className="flex items-center gap-3">
                  <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent tracking-wider">
                    {code}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(code);
                      alert("Game code copied!");
                    }}
                    className="p-2 hover:bg-white rounded-lg transition-colors"
                    title="Copy code"
                  >
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-slate-500 mt-2">Share this code with players to join</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium transition-all shadow-sm hover:shadow"
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
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 font-medium transition-all shadow-lg hover:shadow-xl"
                onClick={handleResetGame}
              >
                Reset Game
              </button>
              <button
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleEndGame}
                disabled={ending}
              >
                {ending ? "Ending..." : "End Game"}
              </button>
            </div>
          </div>
        </div>

      {/* Current Question Control */}
      {game.questions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Game Control</h2>
          </div>
          {currentQuestion ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-600">Current Question</span>
                  <span className="px-3 py-1 bg-white rounded-full text-sm font-bold text-blue-600">
                    {(game.currentQuestionIndex || 0) + 1} of {game.questions.length}
                  </span>
                </div>
                <p className="text-lg font-semibold text-slate-800">{currentQuestion.text}</p>
                {currentQuestion.hasTimer && timeRemaining !== null && !game.answersRevealed && (
                  <div className="mt-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className={`text-lg font-bold ${timeRemaining <= 10 ? 'text-red-600 animate-pulse' : 'text-orange-600'}`}>
                      {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                    </span>
                    <span className="text-sm text-slate-600">remaining</span>
                  </div>
                )}
              </div>
              
              {/* Answer Status */}
              {!game.answersRevealed && (
                <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-blue-900 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Answer Status
                    </p>
                    <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-bold">
                      {game.playerAnswers?.filter((pa: any) => pa.questionId === currentQuestion.id).length || 0} / {game.players.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {game.players.map((player: any) => {
                      const playerAnswer = game.playerAnswers?.find(
                        (pa: any) => pa.playerId === player.id && pa.questionId === currentQuestion.id
                      );
                      const hasAnswered = !!playerAnswer;
                      return (
                        <div key={player.id} className={`p-3 rounded-lg border-2 ${hasAnswered ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-lg ${hasAnswered ? "text-green-600" : "text-slate-400"}`}>
                              {hasAnswered ? "✓" : "○"}
                            </span>
                            <span className={`text-sm font-semibold ${hasAnswered ? "text-green-800" : "text-slate-600"}`}>
                              {player.username}
                            </span>
                          </div>
                          {hasAnswered && currentQuestion.isFillInBlank && playerAnswer.textAnswer && (
                            <div className="mt-2 p-2 bg-white rounded border border-green-300">
                              <p className="text-xs text-slate-500 mb-1">Answer:</p>
                              <p className="text-sm font-medium text-slate-800">{playerAnswer.textAnswer}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Fill-in-the-Blank Scoring Interface (shown BEFORE revealing) */}
              {!game.answersRevealed && currentQuestion.isFillInBlank && (
                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-purple-700 mb-3">Score Fill-in-the-Blank Answers</p>
                  <p className="text-xs text-purple-600 mb-3">Award points and mark answers as correct/incorrect before revealing to players.</p>
                  <div className="space-y-3">
                    {game.players.map((player: any) => {
                      const playerAnswer = game.playerAnswers?.find(
                        (pa: any) => pa.playerId === player.id && pa.questionId === currentQuestion.id
                      );
                      if (!playerAnswer) return null;
                      return (
                        <div key={player.id} className={`bg-white rounded-lg p-4 border-2 ${
                          playerAnswer.manuallyScored 
                            ? (playerAnswer.isCorrect ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50')
                            : 'border-purple-200'
                        }`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="font-semibold text-slate-800">{player.username}</p>
                                {playerAnswer.manuallyScored && (
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                    playerAnswer.isCorrect 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {playerAnswer.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                  </span>
                                )}
                                {!playerAnswer.manuallyScored && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
                                    Not Scored
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-slate-600 mb-3">
                                <span className="font-medium">Answer:</span> <span className="font-semibold text-slate-800">{playerAnswer.textAnswer || "(no answer)"}</span>
                              </p>
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      defaultChecked={playerAnswer.isCorrect || false}
                                      className="w-5 h-5 text-green-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-green-500"
                                      id={`correct-${player.id}`}
                                    />
                                    <span className="text-sm font-medium text-slate-700">Mark as Correct</span>
                                  </label>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max={currentQuestion.points * (currentQuestion.multiplier || 1)}
                                    defaultValue={playerAnswer.pointsEarned || 0}
                                    className="w-20 px-2 py-1 border-2 border-slate-300 rounded text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none"
                                    id={`points-${player.id}`}
                                  />
                                  <span className="text-xs text-slate-500">/ {currentQuestion.points * (currentQuestion.multiplier || 1)} max</span>
                                </div>
                                <button
                                  onClick={async () => {
                                    const pointsInput = document.getElementById(`points-${player.id}`) as HTMLInputElement;
                                    const correctCheckbox = document.getElementById(`correct-${player.id}`) as HTMLInputElement;
                                    const points = Number(pointsInput.value) || 0;
                                    const isCorrect = correctCheckbox.checked;
                                    try {
                                      await manuallyAwardPoints(player.id, currentQuestion.id, points, isCorrect);
                                      loadGame();
                                    } catch (error) {
                                      console.error("Failed to award points:", error);
                                      alert("Failed to award points. Please try again.");
                                    }
                                  }}
                                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 shadow-sm hover:shadow transition-all"
                                >
                                  Save Score
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
              {!game.answersRevealed ? (
                <button
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform transition-all flex items-center gap-2"
                  onClick={handleRevealAnswers}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Reveal Answers
                </button>
              ) : (
                <div className="space-y-4">
                  {!currentQuestion.isFillInBlank && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-green-700 mb-1">Correct Answer</p>
                      <p className="text-lg font-bold text-green-800">{currentQuestion.choices[currentQuestion.answer]}</p>
                    </div>
                  )}
                  {currentQuestion.isFillInBlank && (
                    <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                      <p className="text-sm font-semibold text-purple-700 mb-3">Scored Answers</p>
                      <div className="space-y-2">
                        {game.players.map((player: any) => {
                          const playerAnswer = game.playerAnswers?.find(
                            (pa: any) => pa.playerId === player.id && pa.questionId === currentQuestion.id
                          );
                          if (!playerAnswer) return null;
                          return (
                            <div key={player.id} className={`p-3 rounded-lg border-2 ${
                              playerAnswer.isCorrect ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-slate-800">{player.username}</p>
                                  <p className="text-sm text-slate-600">Answer: <span className="font-medium">{playerAnswer.textAnswer || "(no answer)"}</span></p>
                                </div>
                                <div className="text-right">
                                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                    playerAnswer.isCorrect 
                                      ? 'bg-green-100 text-green-700' 
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {playerAnswer.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                  </span>
                                  <p className="text-sm font-bold text-slate-700 mt-1">{playerAnswer.pointsEarned || 0} pts</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 items-center">
                    <button
                      className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform transition-all flex items-center gap-2"
                      onClick={handleNextQuestion}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      Next Question
                    </button>
                    <span className="text-slate-500 font-medium">or</span>
                    <select
                      className="px-4 py-3 border-2 border-slate-200 rounded-xl bg-white font-medium text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
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
            <div className="space-y-4">
              <p className="text-slate-600 font-medium">No question active. Start the game or select a question:</p>
              <div className="flex flex-wrap gap-3 items-center">
                <button
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform transition-all flex items-center gap-2"
                  onClick={() => handleActivateQuestion(0)}
                  title="Start game from the first question"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Start Game
                </button>
                <span className="text-slate-500 font-medium">or</span>
                <span className="text-sm text-slate-600 font-medium">Jump to question:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {game.questions.map((q: any, idx: number) => (
                  <button
                    key={q.id}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 hover:scale-105 transform transition-all shadow-sm"
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
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Scoreboard</h2>
          </div>
          <div className="space-y-3">
            {sortedPlayers.map((player: any, index: number) => (
              <div 
                key={player.id} 
                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  index === 0 ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300 shadow-md' :
                  index === 1 ? 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-300' :
                  index === 2 ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-300' :
                  'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    index === 0 ? 'bg-yellow-400 text-yellow-900' :
                    index === 1 ? 'bg-slate-400 text-white' :
                    index === 2 ? 'bg-orange-400 text-orange-900' :
                    'bg-slate-300 text-slate-700'
                  }`}>
                    {index + 1}
                  </div>
                  <span className="font-bold text-lg text-slate-800">
                    {player.username}{index === 0 ? ' 👑' : ''}
                  </span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {player.score || 0} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Players</h2>
          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
            {game.players.length}
          </span>
        </div>
        {game.players.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="font-medium">No players joined yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sortedPlayers.map((player: any) => (
              <div key={player.id} className="flex justify-between items-center p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200 hover:shadow-md transition-all">
                <span className="font-semibold text-slate-800">{player.username}</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-bold text-sm">
                  {player.score || 0} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Add Question</h2>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Question Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!isFillInBlank}
                  onChange={() => setIsFillInBlank(false)}
                  className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="font-medium">Multiple Choice</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={isFillInBlank}
                  onChange={() => setIsFillInBlank(true)}
                  className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <span className="font-medium">Fill in the Blank</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Question Text</label>
            <input
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
              placeholder={isFillInBlank ? "Enter your fill-in-the-blank question" : "Enter your question"}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
          </div>
          {!isFillInBlank && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Answer Choices</label>
              <div className="space-y-3">
                {choices.map((choice, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={answer === idx}
                      onChange={() => setAnswer(idx)}
                      className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
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
            </div>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Points</label>
              <input
                type="number"
                className="w-24 px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Multiplier</label>
              <select
                className="px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                value={multiplier}
                onChange={(e) => setMultiplier(Number(e.target.value))}
              >
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={3}>3x</option>
                <option value={4}>4x</option>
              </select>
            </div>
          </div>
          <div className="border-t-2 border-slate-200 pt-4 mt-4">
            <div className="flex items-center gap-3 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasTimer}
                  onChange={(e) => setHasTimer(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm font-semibold text-slate-700">Enable Timer</span>
              </label>
            </div>
            {hasTimer && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Timer Duration (seconds)</label>
                <input
                  type="number"
                  min="1"
                  max="600"
                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  placeholder="e.g., 15 for 15 seconds, 120 for 2 minutes"
                  value={timerSeconds}
                  onChange={(e) => setTimerSeconds(Number(e.target.value) || 30)}
                />
                <p className="text-xs text-slate-500 mt-1">
                  {timerSeconds} second{timerSeconds !== 1 ? 's' : ''} ({Math.floor(timerSeconds / 60)}m {timerSeconds % 60}s)
                </p>
              </div>
            )}
          </div>
          <div className="flex justify-end mt-4">
            <button
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform transition-all flex items-center gap-2"
              onClick={handleAddQuestion}
              disabled={!questionText || (!isFillInBlank && choices.some((c) => !c))}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Question
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Questions</h2>
          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold">
            {game.questions.length}
          </span>
        </div>
        {game.questions.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="font-medium text-lg">No questions added yet</p>
            <p className="text-sm mt-1">Add your first question above to get started</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {game.questions.map((q: any, idx: number) => (
              <li
                key={q.id}
                draggable={editingQuestionId !== q.id}
                onDragStart={(e) => handleDragStart(e, q.id)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={`bg-white border-2 rounded-xl p-4 cursor-move transition-all ${
                  game.currentQuestionIndex === idx 
                    ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-400 shadow-lg" 
                    : "border-slate-200 hover:border-slate-300"
                } ${
                  draggedQuestionId === q.id ? "opacity-50 scale-95" : ""
                } ${
                  dragOverIndex === idx ? "border-blue-500 border-2 bg-blue-50 scale-105" : ""
                } ${
                  editingQuestionId === q.id ? "cursor-default" : "hover:shadow-lg"
                }`}
              >
                {editingQuestionId === q.id ? (
                  <div className="space-y-5">
                    <h3 className="font-bold text-xl text-slate-800 flex items-center gap-2">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Question {idx + 1}
                    </h3>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Question Type</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={!editIsFillInBlank}
                            onChange={() => setEditIsFillInBlank(false)}
                            className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="font-medium">Multiple Choice</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={editIsFillInBlank}
                            onChange={() => setEditIsFillInBlank(true)}
                            className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="font-medium">Fill in the Blank</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Question Text</label>
                      <input
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                        placeholder={editIsFillInBlank ? "Enter your fill-in-the-blank question" : "Enter your question"}
                        value={editQuestionText}
                        onChange={(e) => setEditQuestionText(e.target.value)}
                      />
                    </div>
                    {!editIsFillInBlank && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Answer Choices</label>
                        <div className="space-y-3">
                          {editChoices.map((choice, choiceIdx) => (
                            <div key={choiceIdx} className="flex items-center gap-3">
                              <input
                                type="radio"
                                checked={editAnswer === choiceIdx}
                                onChange={() => setEditAnswer(choiceIdx)}
                                className="w-5 h-5 text-blue-600 focus:ring-2 focus:ring-blue-500"
                              />
                              <input
                                className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                placeholder={`Choice ${choiceIdx + 1}`}
                                value={choice}
                                onChange={(e) => {
                                  const newChoices = [...editChoices];
                                  newChoices[choiceIdx] = e.target.value;
                                  setEditChoices(newChoices);
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Points</label>
                        <input
                          type="number"
                          className="w-24 px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                          value={editPoints}
                          onChange={(e) => setEditPoints(Number(e.target.value))}
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Multiplier</label>
                        <select
                          className="px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
                          value={editMultiplier}
                          onChange={(e) => setEditMultiplier(Number(e.target.value))}
                        >
                          <option value={1}>1x</option>
                          <option value={2}>2x</option>
                          <option value={3}>3x</option>
                          <option value={4}>4x</option>
                        </select>
                      </div>
                    </div>
                    <div className="border-t-2 border-slate-200 pt-4 mt-4">
                      <div className="flex items-center gap-3 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editHasTimer}
                            onChange={(e) => setEditHasTimer(e.target.checked)}
                            className="w-5 h-5 text-blue-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm font-semibold text-slate-700">Enable Timer</span>
                        </label>
                      </div>
                      {editHasTimer && (
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Timer Duration (seconds)</label>
                          <input
                            type="number"
                            min="1"
                            max="600"
                            className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                            placeholder="e.g., 15 for 15 seconds, 120 for 2 minutes"
                            value={editTimerSeconds}
                            onChange={(e) => setEditTimerSeconds(Number(e.target.value) || 30)}
                          />
                          <p className="text-xs text-slate-500 mt-1">
                            {editTimerSeconds} second{editTimerSeconds !== 1 ? 's' : ''} ({Math.floor(editTimerSeconds / 60)}m {editTimerSeconds % 60}s)
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button
                        className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform transition-all flex items-center gap-2"
                        onClick={handleSaveEdit}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save
                      </button>
                      <button
                        className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-all flex items-center gap-2"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-start">
                    <div className="flex-1 flex items-start gap-2">
                      <div className="text-gray-400 mt-1 cursor-grab active:cursor-grabbing" title="Drag to reorder">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                          <circle cx="7" cy="5" r="1.5"/>
                          <circle cx="13" cy="5" r="1.5"/>
                          <circle cx="7" cy="10" r="1.5"/>
                          <circle cx="13" cy="10" r="1.5"/>
                          <circle cx="7" cy="15" r="1.5"/>
                          <circle cx="13" cy="15" r="1.5"/>
                        </svg>
                      </div>
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
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="ml-4 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        onClick={() => handleStartEdit(q)}
                        title="Edit this question"
                      >
                        Edit
                      </button>
                      <button
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        onClick={() => handleResetQuestion(q.id)}
                        title="Reset this question"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
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
