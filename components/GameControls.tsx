"use client";

import { useRef, useState, useEffect } from "react";

interface Question {
  id: string;
  text: string;
  choices: string[];
  answer: number;
  points: number;
  multiplier?: number;
  isFillInBlank?: boolean;
  isTrueFalse?: boolean;
  hasTimer?: boolean;
  timerSeconds?: number | null;
  fillInBlankAnswer?: string | null;
  isBonus?: boolean;
}

interface Player {
  id: string;
  username: string;
}

interface PlayerAnswer {
  playerId: string;
  questionId: string;
  answerIndex: number | null;
  textAnswer: string | null;
  isCorrect: boolean | null;
  pointsEarned: number | null;
  wager?: number | null;
  wagerSlot?: number | null;
}

interface GameControlsProps {
  game: {
    questions: Question[];
    currentQuestionIndex: number | null;
    answersRevealed: boolean;
    players: Player[];
    playerAnswers?: PlayerAnswer[];
    gameType?: 'traditional' | 'wager';
  };
  currentQuestion: Question | null;
  timeRemaining: number | null;
  isRevealing: boolean;
  savingStatus: Record<string, 'saving' | 'saved' | null>;
  minimized: boolean;
  onToggleMinimize: () => void;
  onRevealAnswers: () => void;
  onNextQuestion: () => void;
  onActivateQuestion: (index: number) => void;
  onAutoSavePlayerScore: (playerId: string, questionId: string) => void;
}

export default function GameControls({
  game,
  currentQuestion,
  timeRemaining,
  isRevealing,
  savingStatus,
  minimized,
  onToggleMinimize,
  onRevealAnswers,
  onNextQuestion,
  onActivateQuestion,
  onAutoSavePlayerScore,
}: GameControlsProps) {
  const [showQuestionDropdown, setShowQuestionDropdown] = useState(false);
  const questionDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (questionDropdownRef.current && !questionDropdownRef.current.contains(event.target as Node)) {
        setShowQuestionDropdown(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showQuestionDropdown) {
        setShowQuestionDropdown(false);
      }
    };

    if (showQuestionDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showQuestionDropdown]);

  if (game.questions.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-800">Game control</h2>
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
          {currentQuestion ? (
            <div className="space-y-4 mt-6">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-600">Current question</span>
                  <span className="px-3 py-1 bg-white rounded-full text-sm font-bold text-blue-600">
                    {(game.currentQuestionIndex || 0) + 1} of {game.questions.length}
                  </span>
                </div>
                <p className="text-lg font-semibold text-slate-800">{currentQuestion.text}</p>
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <span className="text-sm font-medium text-slate-600">Correct answer: </span>
                  <span className="text-sm font-bold text-green-700">
                    {currentQuestion.isFillInBlank
                      ? (currentQuestion.fillInBlankAnswer || "N/A")
                      : currentQuestion.isTrueFalse
                      ? (currentQuestion.answer === 0 ? "True" : "False")
                      : currentQuestion.choices[currentQuestion.answer]}
                  </span>
                </div>
                {currentQuestion.hasTimer && !game.answersRevealed && (
                  <div className={`mt-3 flex items-center gap-2 p-2 rounded-lg border-2 ${
                    timeRemaining === 0 
                      ? 'bg-red-50 border-red-300' 
                      : (timeRemaining !== null && timeRemaining <= 10)
                        ? 'bg-orange-50 border-orange-200' 
                        : 'bg-orange-50 border-orange-200'
                  }`}>
                    <svg className={`w-5 h-5 ${timeRemaining === 0 ? 'text-red-600' : 'text-orange-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {timeRemaining === null ? (
                      <span className="text-sm font-medium text-slate-600">
                        Timer active ({currentQuestion.timerSeconds}s)
                      </span>
                    ) : timeRemaining === 0 ? (
                      <span className="text-sm font-bold text-red-600">Time's Up!</span>
                    ) : (
                      <span className={`text-sm font-bold ${timeRemaining <= 10 ? 'text-red-600 animate-pulse' : 'text-orange-600'}`}>
                        {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')} remaining
                      </span>
                    )}
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
                      Answer status
                    </p>
                    <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-bold">
                      {game.playerAnswers?.filter((pa: any) => pa.questionId === currentQuestion.id).length || 0} / {game.players.length}
                    </span>
                  </div>
                  <div className="space-y-2 mt-6">
                    {game.players.map((player: any) => {
                      const playerAnswer = game.playerAnswers?.find(
                        (pa: any) => pa.playerId === player.id && pa.questionId === currentQuestion.id
                      );
                      const hasAnswered = !!playerAnswer;
                      // Check if player ran out of time (timer expired and no answer submitted)
                      const ranOutOfTime = currentQuestion.hasTimer && timeRemaining === 0 && !hasAnswered;
                      return (
                        <div key={player.id} className={`p-3 rounded-lg border-2 ${
                          hasAnswered 
                            ? 'bg-green-50 border-green-200' 
                            : ranOutOfTime
                            ? 'bg-red-50 border-red-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                              <span className={`text-lg ${
                                hasAnswered 
                                  ? "text-green-600" 
                                  : ranOutOfTime
                                  ? "text-red-600"
                                  : "text-slate-400"
                              }`}>
                                {hasAnswered ? "✓" : ranOutOfTime ? "⏱" : "○"}
                              </span>
                              <span className={`text-sm font-semibold ${
                                hasAnswered 
                                  ? "text-green-800" 
                                  : ranOutOfTime
                                  ? "text-red-800"
                                  : "text-slate-600"
                              }`}>
                                {player.username}
                              </span>
                              {hasAnswered && (
                                <span className="text-sm font-medium text-slate-700 px-2 py-1 bg-white rounded border border-green-300">
                                  {currentQuestion.isFillInBlank && playerAnswer.textAnswer ? (
                                    playerAnswer.textAnswer
                                  ) : playerAnswer.answerIndex !== null && playerAnswer.answerIndex !== undefined ? (
                                    currentQuestion.isTrueFalse 
                                      ? (playerAnswer.answerIndex === 0 ? "True" : "False")
                                      : `${String.fromCharCode(65 + playerAnswer.answerIndex)}. ${currentQuestion.choices[playerAnswer.answerIndex] || `Choice ${String.fromCharCode(65 + playerAnswer.answerIndex)}`}`
                                  ) : (
                                    <span className="text-slate-500 italic">No answer</span>
                                  )}
                                </span>
                              )}
                              {ranOutOfTime && (
                                <span className="text-xs font-medium text-red-700 px-2 py-1 bg-red-100 rounded border border-red-300">
                                  Ran out of time
                                </span>
                              )}
                            </div>
                          </div>
                          {currentQuestion.isFillInBlank && hasAnswered && (
                            <div className="flex items-center gap-2 flex-wrap mt-2" key={`scoring-${player.id}-${playerAnswer.pointsEarned}-${playerAnswer.isCorrect}`}>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  defaultChecked={playerAnswer.isCorrect || false}
                                  className="w-4 h-4 text-green-600 border-2 border-slate-300 rounded focus:ring-2 focus:ring-green-500"
                                  id={`correct-${player.id}`}
                                  onChange={(e) => {
                                    // For wager games, calculate points based on wager rules
                                    if (game.gameType === 'wager') {
                                      let calculatedPoints = 0;
                                      if (e.target.checked) {
                                        if (currentQuestion.isBonus) {
                                          // Bonus question: use wager amount
                                          calculatedPoints = playerAnswer.wager || 0;
                                        } else {
                                          // Regular question: use wager_slot value
                                          calculatedPoints = playerAnswer.wagerSlot || 0;
                                        }
                                      } else {
                                        // Incorrect: 0 for regular, -wager for bonus
                                        if (currentQuestion.isBonus) {
                                          calculatedPoints = -(playerAnswer.wager || 0);
                                        } else {
                                          calculatedPoints = 0;
                                        }
                                      }
                                      // Set a hidden input or directly call the save function with calculated points
                                      // For now, we'll update via the points input if it exists
                                      const pointsInput = document.getElementById(`points-${player.id}`) as HTMLInputElement;
                                      if (pointsInput) {
                                        pointsInput.value = calculatedPoints.toString();
                                      }
                                    } else {
                                      // Traditional game: auto-fill max points when checked
                                      const pointsInput = document.getElementById(`points-${player.id}`) as HTMLInputElement;
                                      const maxPoints = currentQuestion.points * (currentQuestion.multiplier || 1);
                                      if (e.target.checked && pointsInput) {
                                        pointsInput.value = maxPoints.toString();
                                      }
                                    }
                                    // Auto-save when checkbox changes
                                    onAutoSavePlayerScore(player.id, currentQuestion.id);
                                  }}
                                />
                                <span className="text-xs font-medium text-slate-700">Correct</span>
                              </label>
                              {game.gameType !== 'wager' && (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max={currentQuestion.points * (currentQuestion.multiplier || 1)}
                                    defaultValue={playerAnswer.pointsEarned || 0}
                                    className="w-16 px-2 py-1 border border-slate-500 bg-white rounded text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                                    id={`points-${player.id}`}
                                    onChange={(e) => {
                                      const maxPoints = currentQuestion.points * (currentQuestion.multiplier || 1);
                                      const inputValue = Number(e.target.value);
                                      // Clamp to max if value exceeds max
                                      if (inputValue > maxPoints) {
                                        e.target.value = maxPoints.toString();
                                      }
                                      // Auto-save when points change
                                      onAutoSavePlayerScore(player.id, currentQuestion.id);
                                    }}
                                  />
                                  <span className="text-xs text-slate-500">pts</span>
                                </div>
                              )}
                              {game.gameType === 'wager' && (
                                <>
                                  <input
                                    type="hidden"
                                    id={`points-${player.id}`}
                                    defaultValue={playerAnswer.pointsEarned || 0}
                                  />
                                  <span className="text-xs text-slate-500">
                                    {currentQuestion.isBonus 
                                      ? `Wager: ${playerAnswer.wager || 0} pts`
                                      : `Slot: ${playerAnswer.wagerSlot || 0} pts`
                                    }
                                  </span>
                                </>
                              )}
                              {savingStatus[player.id] === 'saving' && (
                                <span className="text-xs text-blue-600">Saving...</span>
                              )}
                              {savingStatus[player.id] === 'saved' && (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Saved
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!game.answersRevealed ? (
                <button
                  className="border border-b-4 border-amber-800 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
                  onClick={onRevealAnswers}
                  disabled={isRevealing}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {isRevealing ? "Revealing..." : "Reveal answers"}
                </button>
              ) : (
                <div className="space-y-4">
                  {/* Results Summary - Show which players got it right or wrong */}
                  <div className={`border-2 rounded-xl p-4 ${
                    currentQuestion.isFillInBlank 
                      ? 'bg-purple-50 border-purple-200' 
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <p className={`text-sm font-semibold mb-3 ${
                      currentQuestion.isFillInBlank 
                        ? 'text-purple-700' 
                        : 'text-blue-700'
                    }`}>
                      Results
                    </p>
                    <div className="space-y-2">
                      {game.players.map((player: any) => {
                        const playerAnswer = game.playerAnswers?.find(
                          (pa: any) => pa.playerId === player.id && pa.questionId === currentQuestion.id
                        );
                        if (!playerAnswer) {
                          return (
                            <div key={player.id} className="p-3 rounded-lg border-2 bg-slate-50 border-slate-200">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-slate-800">{player.username}</p>
                                <span className="px-3 py-1 rounded-full text-sm font-bold bg-slate-100 text-slate-600">
                                  No answer
                                </span>
                              </div>
                            </div>
                          );
                        }
                        
                        // Determine the player's answer text for display
                        let playerAnswerText = "";
                        if (currentQuestion.isFillInBlank && playerAnswer.textAnswer) {
                          playerAnswerText = playerAnswer.textAnswer;
                        } else if (playerAnswer.answerIndex !== null && playerAnswer.answerIndex !== undefined) {
                          playerAnswerText = currentQuestion.isTrueFalse 
                            ? (playerAnswer.answerIndex === 0 ? "True" : "False")
                            : `${String.fromCharCode(65 + playerAnswer.answerIndex)}. ${currentQuestion.choices[playerAnswer.answerIndex] || `Choice ${String.fromCharCode(65 + playerAnswer.answerIndex)}`}`;
                        } else {
                          playerAnswerText = "(no answer)";
                        }
                        
                        return (
                          <div key={player.id} className={`p-3 rounded-lg border-2 ${
                            playerAnswer.isCorrect === true 
                              ? 'bg-green-50 border-green-300' 
                              : 'bg-red-50 border-red-300'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-slate-800">{player.username}</p>
                                <p className="text-sm text-slate-600">Answer: <span className="font-medium">{playerAnswerText}</span></p>
                              </div>
                              <div className="text-right">
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                  playerAnswer.isCorrect === true
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {playerAnswer.isCorrect === true ? '✓ Correct' : '✗ Incorrect'}
                                </span>
                                <p className="text-sm font-bold text-slate-700 mt-1">{playerAnswer.pointsEarned || 0} pts</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 items-center w-full">
                    <button
                      className="border border-b-4 border-emerald-900 px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform transition-all flex items-center gap-2"
                      onClick={onNextQuestion}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      Next Question
                    </button>
                    <span className="text-slate-500 font-medium whitespace-nowrap">or</span>
                    <div className="relative flex-1 min-w-0 max-w-md w-full sm:w-auto" ref={questionDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowQuestionDropdown(!showQuestionDropdown)}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white font-medium text-slate-700 hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all flex items-center justify-between gap-2 text-left"
                      >
                        <span className="truncate">Jump to Question...</span>
                        <svg 
                          className={`w-5 h-5 text-slate-500 flex-shrink-0 transition-transform ${showQuestionDropdown ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {showQuestionDropdown && (
                        <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-2xl border-2 border-slate-200 max-h-96 overflow-y-auto">
                          <div className="p-2 space-y-1">
                            {game.questions.map((q: any, idx: number) => (
                              <button
                                key={q.id}
                                type="button"
                                onClick={() => {
                                  onActivateQuestion(idx);
                                  setShowQuestionDropdown(false);
                                }}
                                className="w-full text-left px-4 py-3 rounded-lg hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10 hover:border-primary/30 border-2 border-transparent transition-all group"
                              >
                                <div className="flex items-start gap-2">
                                  <span className="font-bold text-primary flex-shrink-0 mt-0.5">Q{idx + 1}</span>
                                  <span className="text-slate-700 group-hover:text-slate-900 break-words">{q.text}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              <p className="text-slate-800"><strong>No question active.</strong> Start the game or select a question.</p>
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center w-full">
                <div className="flex items-center gap-2">
                  <button
                    className="border border-emerald-900 border-b-4 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform transition-all flex items-center gap-2"
                    onClick={() => onActivateQuestion(0)}
                    title="Start game from the first question"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start game
                  </button>
                  <span className="text-slate-500 font-medium whitespace-nowrap">or</span>
                </div>
                <div className="relative flex-1 min-w-0 max-w-md w-full sm:w-auto" ref={questionDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowQuestionDropdown(!showQuestionDropdown)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white font-medium text-slate-700 hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all flex items-center justify-between gap-2 text-left"
                  >
                    <span className="truncate">Jump to Question...</span>
                    <svg 
                      className={`w-5 h-5 text-slate-500 flex-shrink-0 transition-transform ${showQuestionDropdown ? 'rotate-180' : ''}`}
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showQuestionDropdown && (
                    <div className="absolute z-50 mt-2 w-full bg-white rounded-xl shadow-2xl border-2 border-slate-200 max-h-96 overflow-y-auto">
                      <div className="p-2 space-y-1">
                        {game.questions.map((q: any, idx: number) => (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => {
                              onActivateQuestion(idx);
                              setShowQuestionDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 rounded-lg hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10 hover:border-primary/30 border-2 border-transparent transition-all group"
                          >
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-primary flex-shrink-0 mt-0.5">Q{idx + 1}</span>
                              <span className="text-slate-700 group-hover:text-slate-900 break-words">{q.text}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
