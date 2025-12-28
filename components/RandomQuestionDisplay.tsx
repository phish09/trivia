"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { RANDOM_QUESTIONS, RandomQuestion } from "@/lib/randomQuestions";

export default function RandomQuestionDisplay() {
  // Initialize with a random question index
  const [randomQuestionIndex, setRandomQuestionIndex] = useState<number>(() => 
    Math.floor(Math.random() * RANDOM_QUESTIONS.length)
  );
  const [randomQuestionSelected, setRandomQuestionSelected] = useState<number | null>(null);
  const [randomQuestionRevealed, setRandomQuestionRevealed] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(5);
  const randomQuestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const questionStartTimeRef = useRef<number | null>(null);
  const revealTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasSubmittedRef = useRef<boolean>(false);

  // Decode HTML entities
  const decodeHtmlEntities = (text: string): string => {
    if (typeof document === 'undefined') return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  // Shuffle array function
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Get current random question
  const currentRandomQuestion = useMemo(() => {
    return RANDOM_QUESTIONS[randomQuestionIndex % RANDOM_QUESTIONS.length];
  }, [randomQuestionIndex]);

  // Track when question starts and set up auto-reveal and move-to-next timers
  useEffect(() => {
    // Reset state for new question
    setRandomQuestionSelected(null);
    setRandomQuestionRevealed(false);
    setCountdown(5);
    questionStartTimeRef.current = Date.now();
    hasSubmittedRef.current = false;

    // Clear any existing timeouts
    if (randomQuestionTimeoutRef.current) {
      clearTimeout(randomQuestionTimeoutRef.current);
    }
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
    }

    // Auto-reveal answers after 5 seconds if no one has submitted
    revealTimeoutRef.current = setTimeout(() => {
      if (!hasSubmittedRef.current) {
        setRandomQuestionRevealed(true);
        setCountdown(5); // Start countdown from 5, will show grace period at 0
      }
    }, 5000);

    // Move to next question after 7 seconds (5 countdown + 2 grace period)
    randomQuestionTimeoutRef.current = setTimeout(() => {
      setRandomQuestionIndex((prev) => prev + 1);
    }, 7000);

    return () => {
      if (randomQuestionTimeoutRef.current) {
        clearTimeout(randomQuestionTimeoutRef.current);
      }
      if (revealTimeoutRef.current) {
        clearTimeout(revealTimeoutRef.current);
      }
    };
  }, [randomQuestionIndex]);

  // Memoize shuffled answers for current random question
  const shuffledAnswers = useMemo(() => {
    if (!currentRandomQuestion) return [];
    const isBoolean = currentRandomQuestion.type === 'boolean';
    if (isBoolean) {
      return ['True', 'False'];
    } else {
      return shuffleArray([
        currentRandomQuestion.correct_answer,
        ...currentRandomQuestion.incorrect_answers
      ]);
    }
  }, [currentRandomQuestion]);

  // Handle random question answer selection
  const handleRandomQuestionAnswer = (answerIndex: number) => {
    // Prevent submissions after answers are revealed
    if (randomQuestionRevealed) return;
    
    // Check if we're still within the submission window (7 seconds total including grace period)
    const now = Date.now();
    const elapsed = questionStartTimeRef.current ? (now - questionStartTimeRef.current) / 1000 : 0;
    if (elapsed > 7) {
      // Past the grace period, don't allow submission
      return;
    }
    
    setRandomQuestionSelected(answerIndex);
    setRandomQuestionRevealed(true);
    hasSubmittedRef.current = true;
    
    // Always start countdown from 5 when answers are revealed
    setCountdown(5);
    
    // Clear the auto-reveal timeout since someone submitted
    if (revealTimeoutRef.current) {
      clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }
  };

  // Countdown effect
  useEffect(() => {
    // Clear any existing interval first to prevent multiple intervals
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Only start countdown if revealed and countdown is positive
    if (!randomQuestionRevealed) {
      return;
    }

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Clear interval when countdown reaches 0
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [randomQuestionRevealed]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (randomQuestionTimeoutRef.current) {
        clearTimeout(randomQuestionTimeoutRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  if (!currentRandomQuestion || shuffledAnswers.length === 0) return null;

  const correctAnswerIndex = shuffledAnswers.findIndex(
    answer => answer === currentRandomQuestion.correct_answer
  );
  const isBoolean = currentRandomQuestion.type === 'boolean';

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-slate-200 mt-6">
      <div className="mb-8 text-center px-6 md:px-12">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">
          {currentRandomQuestion.category}
        </p>
        <h2 className="text-xl font-bold text-slate-800">
          {decodeHtmlEntities(currentRandomQuestion.question)}
        </h2>
      </div>
      
      {isBoolean ? (
        <div className="grid grid-cols-2 gap-6">
          {shuffledAnswers.map((answer, index) => {
            const isSelected = randomQuestionSelected === index;
            const isCorrect = index === correctAnswerIndex;
            const showAnswer = randomQuestionRevealed;
            const isTrue = answer === 'True';
            
            // Determine styling based on selection and correctness
            let buttonClass = "p-6 border-2 rounded-xl transition-all ";
            let iconBgClass = "";
            let iconColorClass = "";
            
            if (showAnswer) {
              if (isCorrect) {
                // Correct answer - always show as correct (green)
                buttonClass += "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-600 shadow-lg scale-[1.02]";
                iconBgClass = "bg-white";
                iconColorClass = "text-green-600";
              } else if (isSelected) {
                // Selected but wrong - show as incorrect (red)
                buttonClass += "bg-gradient-to-r from-red-500 to-rose-600 text-white border-red-600 shadow-lg scale-[1.02]";
                iconBgClass = "bg-white";
                iconColorClass = "text-red-600";
              } else {
                // Not selected and wrong - disabled gray
                buttonClass += "bg-slate-100 border-slate-300 cursor-not-allowed opacity-60";
                iconBgClass = "bg-slate-300";
                iconColorClass = "text-slate-500";
              }
            } else {
              // Not revealed yet - normal hover states
              if (isTrue) {
                buttonClass += "bg-white border-slate-200 hover:border-green-300 hover:bg-green-50 hover:shadow-md";
              } else {
                buttonClass += "bg-white border-slate-200 hover:border-red-300 hover:bg-red-50 hover:shadow-md";
              }
              iconBgClass = "bg-slate-200";
              iconColorClass = "text-slate-500";
            }
            
            return (
              <button
                key={index}
                className={buttonClass}
                onClick={() => handleRandomQuestionAnswer(index)}
                disabled={randomQuestionRevealed}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${iconBgClass}`}>
                    {isTrue ? (
                      <svg className={`w-8 h-8 ${iconColorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className={`w-8 h-8 ${iconColorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <span className="font-bold text-xl">{answer}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {shuffledAnswers.map((answer, index) => {
            const isSelected = randomQuestionSelected === index;
            const isCorrect = index === correctAnswerIndex;
            const showAnswer = randomQuestionRevealed;
            
            // Determine styling based on selection and correctness
            let buttonClass = "w-full text-sm md:text-lg text-left py-3 px-4 md:py-5 md:px-8 border-2 rounded-full transition-all ";
            let buttonStyle: React.CSSProperties = {};
            
            if (showAnswer) {
              if (isCorrect) {
                // Correct answer - always show as correct (green gradient)
                buttonClass += "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-600 shadow-lg scale-[1.02]";
              } else if (isSelected) {
                // Selected but wrong - show as incorrect (red)
                buttonClass += "bg-gradient-to-r from-red-500 to-rose-600 text-white border-red-600 shadow-lg scale-[1.02]";
              } else {
                // Not selected and wrong - disabled gray
                buttonClass += "bg-slate-100 border-slate-300 cursor-not-allowed opacity-60 text-slate-500";
              }
            } else {
              // Not revealed yet - normal hover states
              if (isSelected) {
                buttonClass += "text-white border-secondary shadow-lg scale-[1.02]";
                buttonStyle = {
                  background: `linear-gradient(to right, var(--tertiary), var(--fourth-hover))`,
                };
              } else {
                buttonClass += "bg-white border-slate-200 hover:border-secondary hover:shadow-md";
              }
            }
            
            return (
              <button
                key={index}
                className={buttonClass}
                style={buttonStyle}
                onClick={() => handleRandomQuestionAnswer(index)}
                disabled={randomQuestionRevealed}
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{decodeHtmlEntities(answer)}</span>
                  {showAnswer && isCorrect && (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {showAnswer && isSelected && !isCorrect && (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
      
      {/* Countdown Animation */}
      {randomQuestionRevealed && (
        <div className="mt-6 flex flex-col items-center justify-center">
          <div className="text-sm text-slate-500 mb-2">Next question in</div>
          <div className="relative w-20 h-20 flex items-center justify-center">
            {/* Circular progress background */}
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-slate-200"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - countdown / 5)}`}
                className="text-secondary transition-all duration-1000 ease-linear"
                strokeLinecap="round"
              />
            </svg>
            {/* Countdown number */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-secondary">{countdown}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

