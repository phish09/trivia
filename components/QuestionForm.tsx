"use client";

import { useState } from "react";
import type { QuestionInput } from "@/types/game";
import { DEFAULT_POINTS, DEFAULT_MULTIPLIER, DEFAULT_MAX_WAGER, DEFAULT_TIMER_SECONDS, MAX_CHOICES } from "@/lib/constants";

interface QuestionFormProps {
  onSubmit: (question: QuestionInput) => Promise<void>;
  minimized?: boolean;
  onToggleMinimize?: () => void;
  gameType?: 'traditional' | 'wager';
}

export default function QuestionForm({ onSubmit, minimized = false, onToggleMinimize, gameType = 'traditional' }: QuestionFormProps) {
  const [questionText, setQuestionText] = useState("");
  const [choices, setChoices] = useState(["", "", "", ""]);
  const [answer, setAnswer] = useState(0);
  const [points, setPoints] = useState(DEFAULT_POINTS);
  const [multiplier, setMultiplier] = useState(DEFAULT_MULTIPLIER);
  const [isFillInBlank, setIsFillInBlank] = useState(false);
  const [isTrueFalse, setIsTrueFalse] = useState(false);
  const [hasTimer, setHasTimer] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<number | string>(DEFAULT_TIMER_SECONDS);
  const [fillInBlankAnswer, setFillInBlankAnswer] = useState("");
  const [hasWager, setHasWager] = useState(false);
  const [maxWager, setMaxWager] = useState(DEFAULT_MAX_WAGER);

  const handleSubmit = async () => {
    if (!questionText) return;
    if (!isFillInBlank && !isTrueFalse && choices.some((c) => !c)) return;

    await onSubmit({
      text: questionText,
      choices: isFillInBlank ? [] : isTrueFalse ? ["True", "False"] : choices.filter((c) => c),
      answer: isFillInBlank ? -1 : isTrueFalse ? answer : answer,
      points,
      multiplier,
      isFillInBlank,
      isTrueFalse,
      hasTimer,
      timerSeconds: hasTimer ? (Number(timerSeconds) || DEFAULT_TIMER_SECONDS) : undefined,
      fillInBlankAnswer: isFillInBlank ? fillInBlankAnswer : undefined,
      hasWager,
      maxWager: hasWager ? maxWager : undefined,
    });

    // Reset form
    setQuestionText("");
    setChoices(["", "", "", ""]);
    setAnswer(0);
    setPoints(DEFAULT_POINTS);
    setMultiplier(DEFAULT_MULTIPLIER);
    setIsFillInBlank(false);
    setIsTrueFalse(false);
    setHasTimer(false);
    setTimerSeconds(DEFAULT_TIMER_SECONDS);
    setFillInBlankAnswer("");
    setHasWager(false);
    setMaxWager(DEFAULT_MAX_WAGER);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-tertiary to-fourth rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Add question</h2>
        </div>
        {onToggleMinimize && (
          <button
            onClick={onToggleMinimize}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title={minimized ? "Expand" : "Minimize"}
          >
            <svg className={`w-5 h-5 text-slate-600 transition-transform ${minimized ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
        )}
      </div>
      {!minimized && (
        <>
          <div className="space-y-5 mt-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Question type</label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isFillInBlank && !isTrueFalse}
                    onChange={() => {
                      setIsFillInBlank(false);
                      setIsTrueFalse(false);
                    }}
                    className="w-5 h-5 focus:ring-2 focus:ring-primary"
                  />
                  <span className="font-medium">Multiple choice</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={isTrueFalse}
                    onChange={() => {
                      setIsTrueFalse(true);
                      setIsFillInBlank(false);
                      setAnswer(0); // Default to True
                    }}
                    className="w-5 h-5 focus:ring-2 focus:ring-primary"
                  />
                  <span className="font-medium">True or false</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={isFillInBlank}
                    onChange={() => {
                      setIsFillInBlank(true);
                      setIsTrueFalse(false);
                    }}
                    className="w-5 h-5 focus:ring-2 focus:ring-primary"
                  />
                  <span className="font-medium">Fill in the blank</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Question text</label>
              <input
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary outline-none transition-all"
                placeholder={isFillInBlank ? "Enter your fill in the blank question" : "Enter your question"}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
              />
            </div>
            {isFillInBlank && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Correct answer</label>
                <input
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary outline-none transition-all"
                  placeholder="Enter the correct answer"
                  value={fillInBlankAnswer}
                  onChange={(e) => setFillInBlankAnswer(e.target.value)}
                />
              </div>
            )}
            {!isFillInBlank && !isTrueFalse && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Answer choices</label>
                <div className="space-y-3">
                  {choices.map((choice, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={answer === idx}
                        onChange={() => setAnswer(idx)}
                        className="w-5 h-5 focus:ring-2 focus:ring-primary"
                      />
                      <input
                        className="flex-1 px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-primary outline-none transition-all"
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
            {isTrueFalse && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Correct answer</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={answer === 0}
                      onChange={() => setAnswer(0)}
                      className="w-5 h-5 focus:ring-2 focus:ring-primary"
                    />
                    <span className="font-medium text-lg">True</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={answer === 1}
                      onChange={() => setAnswer(1)}
                      className="w-5 h-5 focus:ring-2 focus:ring-primary"
                    />
                    <span className="font-medium text-lg">False</span>
                  </label>
                </div>
              </div>
            )}
            {gameType === 'traditional' && (
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Points</label>
                  <input
                    type="number"
                    className="w-24 px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-primary outline-none transition-all"
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    min="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Multiplier</label>
                  <select
                    className="px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-primary outline-none transition-all bg-white"
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
            )}
            {gameType === 'wager' && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                <p className="text-sm text-purple-800">
                  <strong>Note:</strong> In wager games, points are determined by the slot players choose, not by question settings.
                </p>
              </div>
            )}
            <div className="border-t-2 border-slate-200 pt-4 mt-4">
              <div className="flex items-center gap-3 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasTimer}
                    onChange={(e) => setHasTimer(e.target.checked)}
                    className="w-5 h-5 border-2 border-slate-300 rounded focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-slate-700">Enable timer</span>
                </label>
              </div>
              {hasTimer && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Timer duration (seconds)</label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    maxLength={3}
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-primary outline-none transition-all"
                    placeholder="e.g., 15 for 15 seconds, 120 for 2 minutes"
                    value={timerSeconds === '' ? '' : timerSeconds}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setTimerSeconds('');
                      } else if (value.length <= 3) {
                        const num = Number(value);
                        if (!isNaN(num) && num >= 1 && num <= 999) {
                          setTimerSeconds(num);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      if (timerSeconds === '' || timerSeconds === 0) {
                        setTimerSeconds(DEFAULT_TIMER_SECONDS);
                      }
                    }}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {Number(timerSeconds) || DEFAULT_TIMER_SECONDS} second{(Number(timerSeconds) || DEFAULT_TIMER_SECONDS) !== 1 ? 's' : ''} ({Math.floor((Number(timerSeconds) || DEFAULT_TIMER_SECONDS) / 60)}m {(Number(timerSeconds) || DEFAULT_TIMER_SECONDS) % 60}s)
                  </p>
                </div>
              )}
            </div>
            <div className="border-t-2 border-slate-200 pt-4 mt-4">
              <div className="flex items-center gap-3 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasWager}
                    onChange={(e) => setHasWager(e.target.checked)}
                    className="w-5 h-5 border-2 border-slate-300 rounded focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm font-semibold text-slate-700">Enable wagering</span>
                </label>
              </div>
              {hasWager && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Maximum wager (points)</label>
                  <input
                    type="number"
                    min="1"
                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-primary outline-none transition-all"
                    placeholder="Maximum points players can wager"
                    value={maxWager}
                    onChange={(e) => setMaxWager(Number(e.target.value) || DEFAULT_MAX_WAGER)}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Players can wager up to {maxWager} points. If correct, they gain the wager. If wrong, they lose it.
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button
                className="border border-b-4 border-secondary px-6 py-3 bg-tertiary text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSubmit}
                disabled={!questionText || (!isFillInBlank && !isTrueFalse && choices.some((c) => !c))}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Question
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
