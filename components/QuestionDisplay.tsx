"use client";

import { RefObject } from "react";

interface Question {
  text: string;
  points: number;
  multiplier?: number;
  hasTimer?: boolean;
  timerSeconds?: number | null;
}

interface QuestionDisplayProps {
  currentQuestion: Question;
  timeRemaining: number | null;
  answersRevealed: boolean;
  questionHeadingRef: RefObject<HTMLHeadingElement>;
  formatQuestionText: (text: string) => React.ReactNode;
}

export default function QuestionDisplay({
  currentQuestion,
  timeRemaining,
  answersRevealed,
  questionHeadingRef,
  formatQuestionText,
}: QuestionDisplayProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-center mb-4">
        <div className="text-sm text-slate-600">
          <span className="font-bold text-emerald-600 border border-b-2 border-emerald-600 bg-emerald-100 rounded-full px-3 py-1">{currentQuestion.points} pts</span>
          {currentQuestion.multiplier && currentQuestion.multiplier > 1 && (
            <span className="ml-2 px-2 py-1 bg-tertiary text-white rounded-full font-bold">
              {currentQuestion.multiplier}x
            </span>
          )}
        </div>
      </div>
      {currentQuestion.hasTimer && timeRemaining !== null && timeRemaining > 0 && !answersRevealed && (
        <div className="mb-4 flex items-center justify-center gap-2 p-3 rounded-xl">
          <svg className={`w-6 h-6 text-orange-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {timeRemaining === null ? (
            <>
              <span className="text-2xl font-bold text-orange-600">
                {Math.floor((currentQuestion.timerSeconds || 30) / 60)}:{((currentQuestion.timerSeconds || 30) % 60).toString().padStart(2, '0')}
              </span>
            </>
          ) : (
            <>
              <span className={`text-2xl font-bold ${timeRemaining <= 10 ? 'text-red-600 animate-pulse' : 'text-orange-600'}`}>
                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </span>
            </>
          )}
        </div>
      )}
      <h2 
        id="question-text"
        ref={questionHeadingRef}
        className="text-lg md:text-2xl font-bold text-slate-800 mb-6 pb-6 border-b border-slate-200 px-2 md:px-12 text-center"
      >
        {formatQuestionText(currentQuestion.text)}
      </h2>
    </div>
  );
}
