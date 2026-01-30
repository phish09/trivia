"use client";

import { useRef, useEffect } from "react";

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
  hasWager?: boolean;
  maxWager?: number;
}

interface AnswerSubmissionProps {
  currentQuestion: Question;
  selectedAnswer: number | null;
  textAnswer: string;
  textAnswerDisplay: string;
  wager: number;
  wagerSlot: number | null;
  submitted: boolean;
  timeRemaining: number | null;
  game: {
    answersRevealed: boolean;
    hostName?: string;
    gameType?: 'traditional' | 'wager';
    wagerAmounts?: number[];
    bonusMaxWager?: number;
  };
  usedSlots?: number[];
  isBonus?: boolean;
  answerButtonRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  onAnswerSelect: (answerIndex: number) => void;
  onTextAnswerChange: (value: string) => void;
  onWagerChange: (value: number) => void;
  onWagerSlotSelect?: (slot: number) => void;
  onSubmit: () => void;
  onAnswerKeyDown: (
    e: React.KeyboardEvent<HTMLButtonElement>,
    answerIndex: number,
    totalAnswers: number,
    isTrueFalse: boolean
  ) => void;
}

export default function AnswerSubmission({
  currentQuestion,
  selectedAnswer,
  textAnswer,
  textAnswerDisplay,
  wager,
  wagerSlot,
  submitted,
  timeRemaining,
  game,
  usedSlots = [],
  isBonus = false,
  answerButtonRefs,
  onAnswerSelect,
  onTextAnswerChange,
  onWagerChange,
  onWagerSlotSelect,
  onSubmit,
  onAnswerKeyDown,
}: AnswerSubmissionProps) {
  const isDisabled = submitted || (currentQuestion.hasTimer && timeRemaining === 0);
  const isWagerGame = game.gameType === 'wager';
  const wagerAmounts = game.wagerAmounts || [2, 4, 6, 8, 10];
  const bonusMaxWager = game.bonusMaxWager || 20;

  return (
    <>
      {currentQuestion.isFillInBlank ? (
        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="fill-in-answer" className="block text-sm font-semibold text-slate-700 mb-2">
              Your Answer
            </label>
            <textarea
              id="fill-in-answer"
              aria-label="Your answer"
              aria-required="true"
              className={`w-full px-4 py-3 border-2 rounded-xl outline-none transition-all resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                isDisabled
                  ? "border-slate-300 bg-slate-100 text-slate-500 cursor-not-allowed opacity-60"
                  : "border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              }`}
              rows={4}
              placeholder="Type your answer here..."
              value={textAnswerDisplay}
              onChange={(e) => onTextAnswerChange(e.target.value)}
              disabled={isDisabled}
              aria-disabled={isDisabled}
            />
          </div>
        </div>
      ) : currentQuestion.isTrueFalse ? (
        <div 
          role="radiogroup" 
          aria-labelledby="question-text"
          className="grid grid-cols-2 gap-6 mb-6"
        >
          <button
            ref={(el) => { answerButtonRefs.current[0] = el; }}
            role="radio"
            aria-checked={selectedAnswer === 0}
            aria-label="True"
            className={`p-6 border-2 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              selectedAnswer === 0
                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-600 shadow-lg scale-[1.02]"
                : isDisabled
                ? "bg-slate-100 border-slate-300 cursor-not-allowed opacity-60"
                : "bg-white border-slate-200 hover:border-green-300 hover:bg-green-50 hover:shadow-md"
            }`}
            onClick={() => onAnswerSelect(0)}
            onKeyDown={(e) => onAnswerKeyDown(e, 0, 2, true)}
            disabled={isDisabled}
            tabIndex={selectedAnswer === 0 || (selectedAnswer === null) ? 0 : -1}
          >
            <div className="flex flex-col items-center gap-3">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                selectedAnswer === 0
                  ? "bg-white"
                  : isDisabled
                  ? "bg-slate-300"
                  : "bg-slate-200"
              }`}>
                <svg className={`w-8 h-8 ${selectedAnswer === 0 ? "text-green-600" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-bold text-xl">True</span>
            </div>
          </button>
          <button
            ref={(el) => { answerButtonRefs.current[1] = el; }}
            role="radio"
            aria-checked={selectedAnswer === 1}
            aria-label="False"
            className={`p-6 border-2 rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              selectedAnswer === 1
                ? "bg-gradient-to-r from-red-500 to-rose-600 text-white border-red-600 shadow-lg scale-[1.02]"
                : isDisabled
                ? "bg-slate-100 border-slate-300 cursor-not-allowed opacity-60"
                : "bg-white border-slate-200 hover:border-red-300 hover:bg-red-50 hover:shadow-md"
            }`}
            onClick={() => onAnswerSelect(1)}
            onKeyDown={(e) => onAnswerKeyDown(e, 1, 2, true)}
            disabled={isDisabled}
            tabIndex={selectedAnswer === 1 ? 0 : -1}
          >
            <div className="flex flex-col items-center gap-3">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                selectedAnswer === 1
                  ? "bg-white"
                  : isDisabled
                  ? "bg-slate-300"
                  : "bg-slate-200"
              }`}>
                <svg className={`w-8 h-8 ${selectedAnswer === 1 ? "text-red-600" : "text-slate-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <span className="font-bold text-xl">False</span>
            </div>
          </button>
        </div>
      ) : (
        <div 
          role="radiogroup" 
          aria-labelledby="question-text"
          aria-required="true"
          className="space-y-3 mb-6"
        >
          {currentQuestion.choices.map((choice: string, idx: number) => {
            const optionLetter = String.fromCharCode(65 + idx); // A, B, C, D, etc.
            const isSelected = selectedAnswer === idx;
            // Roving tabindex: only selected answer (or first if none selected) is in tab order
            const tabIndex = isSelected || (selectedAnswer === null && idx === 0) ? 0 : -1;
            
            return (
              <button
                key={idx}
                ref={(el) => { answerButtonRefs.current[idx] = el; }}
                role="radio"
                aria-checked={isSelected}
                aria-label={`Option ${optionLetter}: ${choice}`}
                className={`w-full text-sm md:text-lg text-left py-3 px-4 md:py-5 md:px-8 border-2 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                  isSelected
                    ? "text-white border-secondary shadow-lg scale-[1.02]"
                    : isDisabled
                    ? "bg-slate-100 border-slate-300 cursor-not-allowed opacity-60 text-slate-500"
                    : "bg-white border-slate-200 hover:border-secondary hover:shadow-md"
                }`}
                style={isSelected ? {
                  background: `linear-gradient(to right, var(--tertiary), var(--fourth-hover))`,
                } : {}}
                onClick={() => onAnswerSelect(idx)}
                onKeyDown={(e) => onAnswerKeyDown(e, idx, currentQuestion.choices.length, false)}
                disabled={isDisabled}
                tabIndex={tabIndex}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{choice}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Wager slot selection for wager games */}
      {isWagerGame && onWagerSlotSelect && (
        <div className={`mb-6 p-4 rounded-xl border-2 ${
          (currentQuestion.hasTimer && timeRemaining === 0)
            ? "bg-slate-50 border-slate-300 opacity-60"
            : "bg-purple-50 border-purple-200"
        }`}>
          <label 
            className={`block text-sm font-semibold mb-3 ${
              (currentQuestion.hasTimer && timeRemaining === 0)
                ? "text-slate-500"
                : "text-slate-700"
            }`}
          >
            {isBonus ? `Select wager amount (up to ${bonusMaxWager} points)` : 'Points wager'}
          </label>
          {isBonus ? (
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max={bonusMaxWager}
                step="1"
                inputMode="numeric"
                aria-label="Bonus wager amount"
                className={`w-32 px-4 py-2 rounded-xl outline-none transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 ${
                  submitted || (currentQuestion.hasTimer && timeRemaining === 0)
                    ? "bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-white border-2 border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                }`}
                placeholder="0"
                value={wager || ""}
                onChange={(e) => {
                  if (submitted) return;
                  const rawValue = e.target.value.replace(/[^0-9]/g, '');
                  const value = rawValue === '' ? 0 : parseInt(rawValue, 10);
                  onWagerChange(Math.max(0, Math.min(value, bonusMaxWager)));
                }}
                disabled={submitted || (currentQuestion.hasTimer && timeRemaining === 0)}
              />
              <span className={`text-sm ${
                (currentQuestion.hasTimer && timeRemaining === 0)
                  ? "text-slate-500"
                  : "text-slate-600"
              }`}>
                / {bonusMaxWager} max
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {wagerAmounts.map((amount) => {
                const isUsed = usedSlots.includes(amount);
                const isSelected = wagerSlot === amount;
                return (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => {
                      if (!submitted && !isUsed && onWagerSlotSelect) {
                        onWagerSlotSelect(amount);
                      }
                    }}
                    disabled={submitted || isDisabled || isUsed}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 ${
                      isSelected
                        ? "bg-purple-600 text-white border-2 border-purple-700 shadow-lg scale-105"
                        : isUsed
                        ? "bg-slate-200 text-slate-400 border-2 border-slate-300 cursor-not-allowed opacity-50"
                        : submitted || isDisabled
                        ? "bg-slate-100 border-2 border-slate-300 text-slate-500 cursor-not-allowed opacity-60"
                        : "bg-white border-2 border-purple-300 text-purple-700 hover:border-purple-500 hover:shadow-md"
                    }`}
                  >
                    {amount} pts
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Traditional game wager (optional) */}
      {!isWagerGame && currentQuestion.hasWager && !submitted && (
        <div className={`mb-6 p-4 rounded-xl border-2 ${
          (currentQuestion.hasTimer && timeRemaining === 0)
            ? "bg-slate-50 border-slate-300 opacity-60"
            : "bg-yellow-50 border-yellow-200"
        }`}>
          <label 
            htmlFor="wager-input"
            className={`block text-sm font-semibold mb-2 ${
              (currentQuestion.hasTimer && timeRemaining === 0)
                ? "text-slate-500"
                : "text-slate-700"
            }`}
          >
            Wager (optional)
          </label>
          <div className="flex items-center gap-3">
            <input
              id="wager-input"
              type="number"
              min="0"
              max={currentQuestion.maxWager || 10}
              step="1"
              inputMode="numeric"
              aria-label="Wager amount"
              aria-describedby="wager-description"
              aria-disabled={submitted || (currentQuestion.hasTimer && timeRemaining === 0)}
              className={`w-32 px-4 py-2 rounded-xl outline-none transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 ${
                (currentQuestion.hasTimer && timeRemaining === 0)
                  ? "bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-white border-2 border-slate-200 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200"
              }`}
              placeholder="0"
              value={wager || ""}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/[^0-9]/g, '');
                const value = rawValue === '' ? 0 : parseInt(rawValue, 10);
                const maxWager = currentQuestion.maxWager || 10;
                onWagerChange(Math.max(0, Math.min(value, maxWager)));
              }}
              disabled={submitted || (currentQuestion.hasTimer && timeRemaining === 0)}
            />
            <span className={`text-sm ${
              (currentQuestion.hasTimer && timeRemaining === 0)
                ? "text-slate-500"
                : "text-slate-600"
            }`}>
              / {currentQuestion.maxWager || 10} max
            </span>
          </div>
          <p 
            id="wager-description"
            className={`text-xs mt-2 ${
              (currentQuestion.hasTimer && timeRemaining === 0)
                ? "text-slate-500"
                : "text-slate-800"
            }`}
          >
            {wager > 0 ? (
              <>
                If correct: +{wager + (currentQuestion.points * (currentQuestion.multiplier || 1))} points ({wager} wager + {currentQuestion.points * (currentQuestion.multiplier || 1)} base). If wrong: -{wager} points.
              </>
            ) : (
              "Bet points to potentially gain more (or lose if wrong)"
            )}
          </p>
        </div>
      )}

      {submitted && game && game.answersRevealed !== true ? (
        <div className="bg-primary/10 rounded-full p-6 text-center">
          <p className="text-emerald-700 font-semibold text-base">
            {currentQuestion.hasTimer && timeRemaining === 0
              ? `Waiting for ${game?.hostName || 'host'} to reveal the answer...`
              : 'Answer submitted. Waiting for other players...'}
          </p>
        </div>
      ) : !submitted ? (
        <button
          aria-label="Submit answer"
          aria-disabled={
            (currentQuestion.hasTimer && timeRemaining === 0) ||
            (currentQuestion.isFillInBlank ? !(textAnswerDisplay.trim() || textAnswer.trim()) : selectedAnswer === null) ||
            (isWagerGame && !isBonus && wagerSlot === null) ||
            (isWagerGame && isBonus && wager === 0)
          }
          className={`border border-b-4 border-emerald-900 w-full px-6 py-4 rounded-full font-bold text-lg transition-all disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
            currentQuestion.hasTimer && timeRemaining === 0
              ? 'bg-red-100 text-red-600 border-2 border-b-4 border-red-200'
              : 'bg-emerald-600 text-white border-b-4 border-emerald-600 hover:shadow-xl hover:scale-[1.02] transform disabled:opacity-50'
          }`}
          onClick={onSubmit}
          disabled={
            (currentQuestion.hasTimer && timeRemaining === 0) ||
            (currentQuestion.isFillInBlank ? !(textAnswerDisplay.trim() || textAnswer.trim()) : selectedAnswer === null) ||
            (isWagerGame && !isBonus && wagerSlot === null) ||
            (isWagerGame && isBonus && wager === 0)
          }
        >
          {currentQuestion.hasTimer && timeRemaining === 0 ? 'Ran out of time' : 'Submit answer'}
        </button>
      ) : null}
    </>
  );
}
