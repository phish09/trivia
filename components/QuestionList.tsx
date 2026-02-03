"use client";

import { useState } from "react";
import type { QuestionInput } from "@/types/game";

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
  hasWager?: boolean;
  maxWager?: number | null;
  roundNumber?: number | null;
  isBonus?: boolean;
}

interface QuestionListProps {
  questions: Question[];
  currentQuestionIndex: number | null;
  editingQuestionId: string | null;
  draggedQuestionId: string | null;
  dragOverIndex: number | null;
  gameType?: 'traditional' | 'wager';
  // Edit form state
  editQuestionText: string;
  editChoices: string[];
  editAnswer: number;
  editPoints: number;
  editMultiplier: number;
  editIsFillInBlank: boolean;
  editIsTrueFalse: boolean;
  editHasTimer: boolean;
  editTimerSeconds: number | string;
  editFillInBlankAnswer: string;
  editHasWager: boolean;
  editMaxWager: number;
  editRoundNumber: number | null;
  editIsBonus: boolean;
  editSource: string;
  // Callbacks
  onStartEdit: (question: Question) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDeleteQuestion: (questionId: string) => void;
  onDragStart: (e: React.DragEvent, questionId: string) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  // Setters for edit form
  setEditQuestionText: (text: string) => void;
  setEditChoices: (choices: string[]) => void;
  setEditAnswer: (answer: number) => void;
  setEditPoints: (points: number) => void;
  setEditMultiplier: (multiplier: number) => void;
  setEditIsFillInBlank: (isFillInBlank: boolean) => void;
  setEditIsTrueFalse: (isTrueFalse: boolean) => void;
  setEditHasTimer: (hasTimer: boolean) => void;
  setEditTimerSeconds: (seconds: number | string) => void;
  setEditFillInBlankAnswer: (answer: string) => void;
  setEditHasWager: (hasWager: boolean) => void;
  setEditMaxWager: (maxWager: number) => void;
  setEditRoundNumber: (roundNumber: number | null) => void;
  setEditIsBonus: (isBonus: boolean) => void;
  setEditSource: (source: string) => void;
}

export default function QuestionList({
  questions,
  currentQuestionIndex,
  editingQuestionId,
  draggedQuestionId,
  dragOverIndex,
  gameType = 'traditional' as 'traditional' | 'wager',
  editQuestionText,
  editChoices,
  editAnswer,
  editPoints,
  editMultiplier,
  editIsFillInBlank,
  editIsTrueFalse,
  editHasTimer,
  editTimerSeconds,
  editFillInBlankAnswer,
  editHasWager,
  editMaxWager,
  editRoundNumber,
  editIsBonus,
  editSource,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDeleteQuestion,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  setEditQuestionText,
  setEditChoices,
  setEditAnswer,
  setEditPoints,
  setEditMultiplier,
  setEditIsFillInBlank,
  setEditIsTrueFalse,
  setEditHasTimer,
  setEditTimerSeconds,
  setEditFillInBlankAnswer,
  setEditHasWager,
  setEditMaxWager,
  setEditRoundNumber,
  setEditIsBonus,
  setEditSource,
}: QuestionListProps) {
  // Store gameType with explicit type to prevent narrowing
  const gameTypeValue: 'traditional' | 'wager' = gameType;

  if (questions.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="font-medium text-lg">No questions added yet</p>
        <p className="text-sm mt-1">Add your first question above to get started</p>
      </div>
    );
  }

  // Group questions by round for wager games
  const groupedQuestions = gameTypeValue === 'wager' 
    ? questions.reduce((acc, q, idx) => {
        const round = q.roundNumber || 0;
        if (!acc[round]) {
          acc[round] = { regular: [], bonus: [] };
        }
        if (q.isBonus) {
          acc[round].bonus.push({ ...q, originalIndex: idx });
        } else {
          acc[round].regular.push({ ...q, originalIndex: idx });
        }
        return acc;
      }, {} as Record<number, { regular: Array<Question & { originalIndex: number }>, bonus: Array<Question & { originalIndex: number }> }>)
    : null;

  if (gameTypeValue === 'wager' && groupedQuestions) {
    // Render grouped by rounds
    const rounds = Object.keys(groupedQuestions).map(Number).sort((a, b) => a - b);
    return (
      <div className="space-y-6 mt-6">
        {rounds.map((roundNum) => {
          const round = groupedQuestions[roundNum];
          const regularQuestions = round.regular;
          const bonusQuestions = round.bonus;
          
          return (
            <div key={roundNum} className="border-2 border-purple-200 rounded-xl p-4 bg-purple-50/30">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-3 py-1 bg-purple-600 text-white rounded-lg font-bold text-sm">
                  Round {roundNum}
                </span>
                <span className="text-sm text-slate-600">
                  {regularQuestions.length} regular {regularQuestions.length === 1 ? 'question' : 'questions'}
                  {bonusQuestions.length > 0 && ` + ${bonusQuestions.length} bonus ${bonusQuestions.length === 1 ? 'question' : 'questions'}`}
                </span>
              </div>
              
              {/* Regular questions */}
              <ul className="space-y-3 mb-4">
                {regularQuestions.map((q) => {
                  const idx = q.originalIndex;
                  return (
                    <li
                      key={q.id}
                      draggable={editingQuestionId !== q.id}
                      onDragStart={(e) => onDragStart(e, q.id)}
                      onDragOver={(e) => onDragOver(e, idx)}
                      onDragLeave={onDragLeave}
                      onDrop={(e) => onDrop(e, idx)}
                      onDragEnd={onDragEnd}
                      className={`bg-white border-2 rounded-xl p-4 cursor-move transition-all ${
                        currentQuestionIndex === idx 
                          ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-400 shadow-lg" 
                          : "border-b-6 border-slate-300 hover:border-slate-800"
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
                            Edit question {idx + 1}
                          </h3>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Question type</label>
                            <div className="flex flex-wrap gap-4">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  checked={!editIsFillInBlank && !editIsTrueFalse}
                                  onChange={() => {
                                    setEditIsFillInBlank(false);
                                    setEditIsTrueFalse(false);
                                  }}
                                  className="w-5 h-5 focus:ring-2 focus:ring-primary"
                                />
                                <span className="font-medium">Multiple Choice</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  checked={editIsTrueFalse}
                                  onChange={() => {
                                    setEditIsTrueFalse(true);
                                    setEditIsFillInBlank(false);
                                    setEditAnswer(0);
                                  }}
                                  className="w-5 h-5 focus:ring-2 focus:ring-primary"
                                />
                                <span className="font-medium">True or False</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  checked={editIsFillInBlank}
                                  onChange={() => {
                                    setEditIsFillInBlank(true);
                                    setEditIsTrueFalse(false);
                                  }}
                                  className="w-5 h-5 focus:ring-2 focus:ring-primary"
                                />
                                <span className="font-medium">Fill in the Blank</span>
                              </label>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Question text</label>
                            <input
                              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                              placeholder={editIsFillInBlank ? "Enter your fill-in-the-blank question" : "Enter your question"}
                              value={editQuestionText}
                              onChange={(e) => setEditQuestionText(e.target.value)}
                            />
                          </div>
                          {editIsFillInBlank && (
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Correct answer</label>
                              <input
                                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                placeholder="Enter the correct answer"
                                value={editFillInBlankAnswer}
                                onChange={(e) => setEditFillInBlankAnswer(e.target.value)}
                              />
                            </div>
                          )}
                          {!editIsFillInBlank && !editIsTrueFalse && (
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Answer choices</label>
                              <div className="space-y-3">
                                {editChoices.map((choice, choiceIdx) => (
                                  <div key={choiceIdx} className="flex items-center gap-3">
                                    <input
                                      type="radio"
                                      checked={editAnswer === choiceIdx}
                                      onChange={() => setEditAnswer(choiceIdx)}
                                      className="w-5 h-5 focus:ring-2 focus:ring-primary"
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
                          {editIsTrueFalse && (
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">Correct answer</label>
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    checked={editAnswer === 0}
                                    onChange={() => setEditAnswer(0)}
                                    className="w-5 h-5 focus:ring-2 focus:ring-primary"
                                  />
                                  <span className="font-medium text-lg">True</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="radio"
                                    checked={editAnswer === 1}
                                    onChange={() => setEditAnswer(1)}
                                    className="w-5 h-5 focus:ring-2 focus:ring-primary"
                                  />
                                  <span className="font-medium text-lg">False</span>
                                </label>
                              </div>
                            </div>
                          )}
                          {gameTypeValue === 'wager' && (
                            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                              <p className="text-sm text-purple-800">
                                <strong>Note:</strong> In wager games, points are determined by the slot players choose.
                              </p>
                            </div>
                          )}
                          <div className="border-t-2 border-slate-200 pt-4 mt-4">
                            <div className="flex items-center gap-3 mb-3">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editHasTimer}
                                  onChange={(e) => setEditHasTimer(e.target.checked)}
                                  className="w-5 h-5 border-2 border-slate-300 rounded focus:ring-2 focus:ring-primary"
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
                                  max="999"
                                  maxLength={3}
                                  className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                  placeholder="e.g., 15 for 15 seconds, 120 for 2 minutes"
                                  value={editTimerSeconds === '' ? '' : editTimerSeconds}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '') {
                                      setEditTimerSeconds('');
                                    } else if (value.length <= 3) {
                                      const num = Number(value);
                                      if (!isNaN(num) && num >= 1 && num <= 999) {
                                        setEditTimerSeconds(num);
                                      }
                                    }
                                  }}
                                  onBlur={(e) => {
                                    if (editTimerSeconds === '' || editTimerSeconds === 0) {
                                      setEditTimerSeconds(30);
                                    }
                                  }}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                  {Number(editTimerSeconds) || 30} second{(Number(editTimerSeconds) || 30) !== 1 ? 's' : ''} ({Math.floor((Number(editTimerSeconds) || 30) / 60)}m {(Number(editTimerSeconds) || 30) % 60}s)
                                </p>
                              </div>
                            )}
                          </div>
                          {gameType === 'wager' && (
                            <div className="border-t-2 border-slate-200 pt-4 mt-4">
                              <h4 className="text-sm font-semibold text-slate-700 mb-3">Round Assignment</h4>
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-sm font-semibold text-slate-700 mb-2">Round number</label>
                                  <input
                                    type="number"
                                    min="1"
                                    className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                    placeholder="Round number (e.g., 1, 2, 3...)"
                                    value={editRoundNumber || ''}
                                    onChange={(e) => setEditRoundNumber(e.target.value ? parseInt(e.target.value) : null)}
                                  />
                                  <p className="text-xs text-slate-500 mt-1">
                                    Assign this question to a round. Each round typically has 5 regular questions.
                                  </p>
                                </div>
                                <div>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editIsBonus}
                                      onChange={(e) => setEditIsBonus(e.target.checked)}
                                      className="w-5 h-5 border-2 border-slate-300 rounded focus:ring-2 focus:ring-primary"
                                    />
                                    <span className="text-sm font-semibold text-slate-700">This is a bonus question</span>
                                  </label>
                                  <p className="text-xs text-slate-500 mt-1 ml-7">
                                    Bonus questions appear after the 5 regular questions in a round.
                                  </p>
                                </div>
                              </div>
                            </div>
                              )}
                              <div className="border-t-2 border-slate-200 pt-4 mt-4">
                                <div>
                                  <label className="block text-sm font-semibold text-slate-700 mb-2">Source/Attribution (optional)</label>
                                  <input
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                    placeholder="e.g., Wikipedia, Book Title, etc."
                                    value={editSource}
                                    onChange={(e) => setEditSource(e.target.value)}
                                  />
                                  <p className="text-xs text-slate-500 mt-1">
                                    Add context or attribution for the answer. This will be shown to players when answers are revealed.
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-3 pt-2">
                                <button
                                  className="border border-b-4 border-emerald-900 px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform transition-all flex items-center gap-2"
                                  onClick={onSaveEdit}
                                >
                                  Save
                                </button>
                                <button
                                  className="border border-b-4 border-slate-700 px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-all flex items-center gap-2"
                                  onClick={onCancelEdit}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col md:flex-row justify-between items-start">
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
                              {q.choices && q.choices.length > 0 && (
                                <p className="text-sm text-gray-600">
                                  {q.choices.map((c: string, i: number) => (
                                    <span key={i} className={i === q.answer ? "font-bold" : ""}>
                                      {i === q.answer ? "✓ " : ""}{c}
                                      {i < q.choices.length - 1 ? " | " : ""}
                                    </span>
                                  ))}
                                </p>
                              )}
                              <p className="text-sm text-gray-500">
                                {gameTypeValue === 'wager' && (q.roundNumber || q.isBonus) && (
                                  <span className="text-purple-600 font-semibold">
                                    Round {q.roundNumber || '?'} {q.isBonus ? '(Bonus)' : ''}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3 ml-7 md:ml-0 md:mt-0">
                            <button
                              className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-hover"
                              onClick={() => onStartEdit(q)}
                              title="Edit this question"
                            >
                              Edit
                            </button>
                            <button
                              className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 flex items-center justify-center"
                              onClick={() => onDeleteQuestion(q.id)}
                              title="Delete this question"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              
              {/* Bonus questions */}
              {bonusQuestions.length > 0 && (
                <div className="mt-4 pt-4 border-t-2 border-purple-300">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 bg-yellow-500 text-white rounded text-xs font-semibold">
                      BONUS
                    </span>
                  </div>
                  <ul className="space-y-3">
                    {bonusQuestions.map((q) => {
                      const idx = q.originalIndex;
                      return (
                        <li
                          key={q.id}
                          draggable={editingQuestionId !== q.id}
                          onDragStart={(e) => onDragStart(e, q.id)}
                          onDragOver={(e) => onDragOver(e, idx)}
                          onDragLeave={onDragLeave}
                          onDrop={(e) => onDrop(e, idx)}
                          onDragEnd={onDragEnd}
                          className={`bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 cursor-move transition-all ${
                            currentQuestionIndex === idx 
                              ? "bg-gradient-to-r from-yellow-100 to-amber-100 border-yellow-500 shadow-lg" 
                              : "border-b-6 border-yellow-400 hover:border-yellow-600"
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
                                Edit question {idx + 1} (Bonus)
                              </h3>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Question type</label>
                                <div className="flex flex-wrap gap-4">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      checked={!editIsFillInBlank && !editIsTrueFalse}
                                      onChange={() => {
                                        setEditIsFillInBlank(false);
                                        setEditIsTrueFalse(false);
                                      }}
                                      className="w-5 h-5 focus:ring-2 focus:ring-primary"
                                    />
                                    <span className="font-medium">Multiple Choice</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      checked={editIsTrueFalse}
                                      onChange={() => {
                                        setEditIsTrueFalse(true);
                                        setEditIsFillInBlank(false);
                                        setEditAnswer(0);
                                      }}
                                      className="w-5 h-5 focus:ring-2 focus:ring-primary"
                                    />
                                    <span className="font-medium">True or False</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      checked={editIsFillInBlank}
                                      onChange={() => {
                                        setEditIsFillInBlank(true);
                                        setEditIsTrueFalse(false);
                                      }}
                                      className="w-5 h-5 focus:ring-2 focus:ring-primary"
                                    />
                                    <span className="font-medium">Fill in the Blank</span>
                                  </label>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Question text</label>
                                <input
                                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                  placeholder={editIsFillInBlank ? "Enter your fill-in-the-blank question" : "Enter your question"}
                                  value={editQuestionText}
                                  onChange={(e) => setEditQuestionText(e.target.value)}
                                />
                              </div>
                              {editIsFillInBlank && (
                                <div>
                                  <label className="block text-sm font-semibold text-slate-700 mb-2">Correct answer</label>
                                  <input
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                    placeholder="Enter the correct answer"
                                    value={editFillInBlankAnswer}
                                    onChange={(e) => setEditFillInBlankAnswer(e.target.value)}
                                  />
                                </div>
                              )}
                              {!editIsFillInBlank && !editIsTrueFalse && (
                                <div>
                                  <label className="block text-sm font-semibold text-slate-700 mb-2">Answer choices</label>
                                  <div className="space-y-3">
                                    {editChoices.map((choice, choiceIdx) => (
                                      <div key={choiceIdx} className="flex items-center gap-3">
                                        <input
                                          type="radio"
                                          checked={editAnswer === choiceIdx}
                                          onChange={() => setEditAnswer(choiceIdx)}
                                          className="w-5 h-5 focus:ring-2 focus:ring-primary"
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
                              {editIsTrueFalse && (
                                <div>
                                  <label className="block text-sm font-semibold text-slate-700 mb-2">Correct answer</label>
                                  <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={editAnswer === 0}
                                        onChange={() => setEditAnswer(0)}
                                        className="w-5 h-5 focus:ring-2 focus:ring-primary"
                                      />
                                      <span className="font-medium text-lg">True</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        checked={editAnswer === 1}
                                        onChange={() => setEditAnswer(1)}
                                        className="w-5 h-5 focus:ring-2 focus:ring-primary"
                                      />
                                      <span className="font-medium text-lg">False</span>
                                    </label>
                                  </div>
                                </div>
                              )}
                              {gameType === 'wager' && (
                                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                                  <p className="text-sm text-purple-800">
                                    <strong>Note:</strong> In wager games, points are determined by the slot players choose.
                                  </p>
                                </div>
                              )}
                              <div className="border-t-2 border-slate-200 pt-4 mt-4">
                                <div className="flex items-center gap-3 mb-3">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={editHasTimer}
                                      onChange={(e) => setEditHasTimer(e.target.checked)}
                                      className="w-5 h-5 border-2 border-slate-300 rounded focus:ring-2 focus:ring-primary"
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
                                      max="999"
                                      maxLength={3}
                                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                      placeholder="e.g., 15 for 15 seconds, 120 for 2 minutes"
                                      value={editTimerSeconds === '' ? '' : editTimerSeconds}
                                      onChange={(e) => {
                                        const value = e.target.value;
                                        if (value === '') {
                                          setEditTimerSeconds('');
                                        } else if (value.length <= 3) {
                                          const num = Number(value);
                                          if (!isNaN(num) && num >= 1 && num <= 999) {
                                            setEditTimerSeconds(num);
                                          }
                                        }
                                      }}
                                      onBlur={(e) => {
                                        if (editTimerSeconds === '' || editTimerSeconds === 0) {
                                          setEditTimerSeconds(30);
                                        }
                                      }}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                      {Number(editTimerSeconds) || 30} second{(Number(editTimerSeconds) || 30) !== 1 ? 's' : ''} ({Math.floor((Number(editTimerSeconds) || 30) / 60)}m {(Number(editTimerSeconds) || 30) % 60}s)
                                    </p>
                                  </div>
                                )}
                              </div>
                              {gameType === 'wager' && (
                                <div className="border-t-2 border-slate-200 pt-4 mt-4">
                                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Round Assignment</h4>
                                  <div className="space-y-3">
                                    <div>
                                      <label className="block text-sm font-semibold text-slate-700 mb-2">Round number</label>
                                      <input
                                        type="number"
                                        min="1"
                                        className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                        placeholder="Round number (e.g., 1, 2, 3...)"
                                        value={editRoundNumber || ''}
                                        onChange={(e) => setEditRoundNumber(e.target.value ? parseInt(e.target.value) : null)}
                                      />
                                      <p className="text-xs text-slate-500 mt-1">
                                        Assign this question to a round. Each round typically has 5 regular questions.
                                      </p>
                                    </div>
                                    <div>
                                      <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={editIsBonus}
                                          onChange={(e) => setEditIsBonus(e.target.checked)}
                                          className="w-5 h-5 border-2 border-slate-300 rounded focus:ring-2 focus:ring-primary"
                                        />
                                        <span className="text-sm font-semibold text-slate-700">This is a bonus question</span>
                                      </label>
                                      <p className="text-xs text-slate-500 mt-1 ml-7">
                                        Bonus questions appear after the 5 regular questions in a round.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className="border-t-2 border-slate-200 pt-4 mt-4">
                                <div>
                                  <label className="block text-sm font-semibold text-slate-700 mb-2">Source/Attribution (optional)</label>
                                  <input
                                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                                    placeholder="e.g., Wikipedia, Book Title, etc."
                                    value={editSource}
                                    onChange={(e) => setEditSource(e.target.value)}
                                  />
                                  <p className="text-xs text-slate-500 mt-1">
                                    Add context or attribution for the answer. This will be shown to players when answers are revealed.
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-3 pt-2">
                                <button
                                  className="border border-b-4 border-emerald-900 px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform transition-all flex items-center gap-2"
                                  onClick={onSaveEdit}
                                >
                                  Save
                                </button>
                                <button
                                  className="border border-b-4 border-slate-700 px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-all flex items-center gap-2"
                                  onClick={onCancelEdit}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col md:flex-row justify-between items-start">
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
                                  <p className="font-semibold">{idx + 1}. {q.text} <span className="text-yellow-600 font-bold">[BONUS]</span></p>
                                  {q.choices && q.choices.length > 0 && (
                                    <p className="text-sm text-gray-600">
                                      {q.choices.map((c: string, i: number) => (
                                        <span key={i} className={i === q.answer ? "font-bold" : ""}>
                                          {i === q.answer ? "✓ " : ""}{c}
                                          {i < q.choices.length - 1 ? " | " : ""}
                                        </span>
                                      ))}
                                    </p>
                                  )}
                                  <p className="text-sm text-gray-500">
                                    {gameTypeValue === 'wager' && (q.roundNumber || q.isBonus) && (
                                      <span className="text-purple-600 font-semibold">
                                        Round {q.roundNumber || '?'} (Bonus)
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-3 ml-7 md:ml-0 md:mt-0">
                                <button
                                  className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-hover"
                                  onClick={() => onStartEdit(q)}
                                  title="Edit this question"
                                >
                                  Edit
                                </button>
                                <button
                                  className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 flex items-center justify-center"
                                  onClick={() => onDeleteQuestion(q.id)}
                                  title="Delete this question"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Traditional game rendering (original code)
  return (
    <ul className="space-y-3 mt-6">
      {questions.map((q, idx) => (
        <li
          key={q.id}
          draggable={editingQuestionId !== q.id}
          onDragStart={(e) => onDragStart(e, q.id)}
          onDragOver={(e) => onDragOver(e, idx)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, idx)}
          onDragEnd={onDragEnd}
          className={`bg-white border-2 rounded-xl p-4 cursor-move transition-all ${
            currentQuestionIndex === idx 
              ? "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-400 shadow-lg" 
              : "border-b-6 border-slate-300 hover:border-slate-800"
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
                Edit question {idx + 1}
              </h3>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Question type</label>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!editIsFillInBlank && !editIsTrueFalse}
                      onChange={() => {
                        setEditIsFillInBlank(false);
                        setEditIsTrueFalse(false);
                      }}
                      className="w-5 h-5 focus:ring-2 focus:ring-primary"
                    />
                    <span className="font-medium">Multiple Choice</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={editIsTrueFalse}
                      onChange={() => {
                        setEditIsTrueFalse(true);
                        setEditIsFillInBlank(false);
                        setEditAnswer(0); // Default to True
                      }}
                      className="w-5 h-5 focus:ring-2 focus:ring-primary"
                    />
                    <span className="font-medium">True or False</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={editIsFillInBlank}
                      onChange={() => {
                        setEditIsFillInBlank(true);
                        setEditIsTrueFalse(false);
                      }}
                      className="w-5 h-5 focus:ring-2 focus:ring-primary"
                    />
                    <span className="font-medium">Fill in the Blank</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Question text</label>
                <input
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                  placeholder={editIsFillInBlank ? "Enter your fill-in-the-blank question" : "Enter your question"}
                  value={editQuestionText}
                  onChange={(e) => setEditQuestionText(e.target.value)}
                />
              </div>
              {editIsFillInBlank && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Correct answer</label>
                  <input
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    placeholder="Enter the correct answer"
                    value={editFillInBlankAnswer}
                    onChange={(e) => setEditFillInBlankAnswer(e.target.value)}
                  />
                </div>
              )}
              {!editIsFillInBlank && !editIsTrueFalse && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Answer choices</label>
                  <div className="space-y-3">
                    {editChoices.map((choice, choiceIdx) => (
                      <div key={choiceIdx} className="flex items-center gap-3">
                        <input
                          type="radio"
                          checked={editAnswer === choiceIdx}
                          onChange={() => setEditAnswer(choiceIdx)}
                          className="w-5 h-5 focus:ring-2 focus:ring-primary"
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
              {editIsTrueFalse && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Correct answer</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={editAnswer === 0}
                        onChange={() => setEditAnswer(0)}
                        className="w-5 h-5 focus:ring-2 focus:ring-primary"
                      />
                      <span className="font-medium text-lg">True</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={editAnswer === 1}
                        onChange={() => setEditAnswer(1)}
                        className="w-5 h-5 focus:ring-2 focus:ring-primary"
                      />
                      <span className="font-medium text-lg">False</span>
                    </label>
                  </div>
                </div>
              )}
              {gameTypeValue === 'traditional' && (
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
              )}
              {gameType === 'wager' && (
                <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                  <p className="text-sm text-purple-800">
                    <strong>Note:</strong> In wager games, points are determined by the slot players choose.
                  </p>
                </div>
              )}
              <div className="border-t-2 border-slate-200 pt-4 mt-4">
                <div className="flex items-center gap-3 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editHasTimer}
                      onChange={(e) => setEditHasTimer(e.target.checked)}
                      className="w-5 h-5 border-2 border-slate-300 rounded focus:ring-2 focus:ring-primary"
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
                      max="999"
                      maxLength={3}
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                      placeholder="e.g., 15 for 15 seconds, 120 for 2 minutes"
                      value={editTimerSeconds === '' ? '' : editTimerSeconds}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                          setEditTimerSeconds(''); // Allow empty temporarily
                        } else if (value.length <= 3) {
                          const num = Number(value);
                          if (!isNaN(num) && num >= 1 && num <= 999) {
                            setEditTimerSeconds(num);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        if (editTimerSeconds === '' || editTimerSeconds === 0) {
                          setEditTimerSeconds(30); // Default to 30 if empty on blur
                        }
                      }}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {Number(editTimerSeconds) || 30} second{(Number(editTimerSeconds) || 30) !== 1 ? 's' : ''} ({Math.floor((Number(editTimerSeconds) || 30) / 60)}m {(Number(editTimerSeconds) || 30) % 60}s)
                    </p>
                  </div>
                )}
              </div>
              <div className="border-t-2 border-slate-200 pt-4 mt-4">
                <div className="flex items-center gap-3 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editHasWager}
                      onChange={(e) => setEditHasWager(e.target.checked)}
                      className="w-5 h-5 border-2 border-slate-300 rounded focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm font-semibold text-slate-700">Enable wagering</span>
                  </label>
                </div>
                {editHasWager && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Maximum wager (points)</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full px-4 py-2 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                      placeholder="Maximum points players can wager"
                      value={editMaxWager}
                      onChange={(e) => setEditMaxWager(Number(e.target.value) || 10)}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Players can wager up to {editMaxWager} points. If correct, they gain the wager. If wrong, they lose it.
                    </p>
                  </div>
                )}
              </div>
              <div className="border-t-2 border-slate-200 pt-4 mt-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Source/Attribution (optional)</label>
                  <input
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
                    placeholder="e.g., Wikipedia, Book Title, etc."
                    value={editSource}
                    onChange={(e) => setEditSource(e.target.value)}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Add context or attribution for the answer. This will be shown to players when answers are revealed.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  className="border border-b-4 border-emerald-900 px-6 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transform transition-all flex items-center gap-2"
                  onClick={onSaveEdit}
                >
                  Save
                </button>
                <button
                  className="border border-b-4 border-slate-700 px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300 transition-all flex items-center gap-2"
                  onClick={onCancelEdit}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row justify-between items-start">
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
                  {q.choices && q.choices.length > 0 && (
                    <p className="text-sm text-gray-600">
                      {q.choices.map((c: string, i: number) => (
                        <span key={i} className={i === q.answer ? "font-bold" : ""}>
                          {i === q.answer ? "✓ " : ""}{c}
                          {i < q.choices.length - 1 ? " | " : ""}
                        </span>
                      ))}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    {gameTypeValue === 'traditional' && (
                      <>
                        Points: {q.points} | Multiplier: {q.multiplier || 1}x 
                        {q.multiplier && q.multiplier > 1 && (
                          <span className="ml-1 text-green-600 font-semibold">
                            (Max: {q.points * (q.multiplier || 1)})
                          </span>
                        )}
                      </>
                    )}
                    {gameTypeValue === 'wager' && (q.roundNumber || q.isBonus) && (
                      <span className="text-purple-600 font-semibold">
                        Round {q.roundNumber || '?'} {q.isBonus ? '(Bonus)' : ''}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 ml-7 md:ml-0 md:mt-0">
                <button
                  className="px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary-hover"
                  onClick={() => onStartEdit(q)}
                  title="Edit this question"
                >
                  Edit
                </button>
                <button
                  className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 flex items-center justify-center"
                  onClick={() => onDeleteQuestion(q.id)}
                  title="Delete this question"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
