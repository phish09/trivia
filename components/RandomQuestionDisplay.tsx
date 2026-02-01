"use client";

import { useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
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
  const scrollPositionRef = useRef<number>(0);
  const isUpdatingCountdownRef = useRef<boolean>(false);

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

  // Track when question starts - reset state for new question
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
    
    setRandomQuestionSelected(answerIndex);
    setRandomQuestionRevealed(true);
    hasSubmittedRef.current = true;
    
    // Start countdown from 5 when answers are revealed
    setCountdown(5);
  };

  // Preserve scroll position during countdown updates (prevents mobile scroll jumps)
  useLayoutEffect(() => {
    if (isUpdatingCountdownRef.current && typeof window !== 'undefined') {
      // Use requestAnimationFrame to restore scroll after browser has updated layout
      requestAnimationFrame(() => {
        const savedScroll = scrollPositionRef.current;
        const currentScroll = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
        // Only restore if scroll position changed significantly (more than 10px)
        // This prevents interfering with intentional user scrolling
        if (Math.abs(currentScroll - savedScroll) > 10) {
          window.scrollTo({
            top: savedScroll,
            behavior: 'auto'
          });
        }
        isUpdatingCountdownRef.current = false;
      });
    }
  }, [countdown]);

  // Countdown effect - only runs when answer is revealed
  useEffect(() => {
    // Clear any existing interval first to prevent multiple intervals
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    // Only start countdown if revealed
    if (!randomQuestionRevealed) {
      return;
    }

    countdownIntervalRef.current = setInterval(() => {
      // Save scroll position before state update
      if (typeof window !== 'undefined') {
        scrollPositionRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;
        isUpdatingCountdownRef.current = true;
      }
      
      setCountdown((prev) => {
        if (prev <= 1) {
          // Clear interval when countdown reaches 0
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
          }
          // Move to next question when countdown reaches 0
          setRandomQuestionIndex((prevIndex) => prevIndex + 1);
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
            
            // Determine styling based on selection and correctness - match game UI
            let buttonClass = "p-6 border-2 rounded-xl transition-all ";
            let iconCircleClass = "w-16 h-16 rounded-full flex items-center justify-center ";
            let iconColor = "text-slate-500";
            
            if (showAnswer) {
              if (isCorrect) {
                // Correct answer - faded green
                buttonClass += "bg-green-100 border-green-400";
                iconCircleClass += "bg-green-200";
                iconColor = "text-green-600";
              } else if (isSelected) {
                // Selected but wrong - faded red
                buttonClass += "bg-red-100 border-red-400";
                iconCircleClass += "bg-red-200";
                iconColor = "text-red-600";
              } else {
                // Not selected and wrong - faded gray
                buttonClass += "bg-slate-50 border-slate-200";
                iconCircleClass += "bg-slate-200";
                iconColor = "text-slate-500";
              }
            } else {
              // Not revealed yet - normal hover states
              iconCircleClass += "bg-slate-200";
              if (isTrue) {
                buttonClass += "bg-white border-slate-200 hover:border-green-300 hover:bg-green-50 hover:shadow-md";
                if (isSelected) {
                  iconCircleClass = "w-16 h-16 rounded-full flex items-center justify-center bg-white";
                  iconColor = "text-green-600";
                }
              } else {
                buttonClass += "bg-white border-slate-200 hover:border-red-300 hover:bg-red-50 hover:shadow-md";
                if (isSelected) {
                  iconCircleClass = "w-16 h-16 rounded-full flex items-center justify-center bg-white";
                  iconColor = "text-red-600";
                }
              }
            }
            
            return (
              <button
                key={index}
                className={buttonClass}
                onClick={() => handleRandomQuestionAnswer(index)}
                disabled={randomQuestionRevealed}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className={iconCircleClass}>
                    {showAnswer ? (
                      // When revealed, show check for correct, X for wrong selected
                      isCorrect ? (
                        <svg className={`w-8 h-8 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : isSelected ? (
                        <svg className={`w-8 h-8 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      ) : (
                        // Not selected and wrong - show default icon based on True/False
                        isTrue ? (
                          <svg className={`w-8 h-8 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className={`w-8 h-8 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )
                      )
                    ) : (
                      // Not revealed yet - show icon based on True/False
                      isTrue ? (
                        <svg className={`w-8 h-8 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className={`w-8 h-8 ${iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )
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
            
            // Determine styling based on selection and correctness - match game UI
            let buttonClass = "w-full text-sm md:text-lg text-left border-2 rounded-full transition-all ";
            let buttonStyle: React.CSSProperties = {};
            
            // Keep padding consistent to prevent button growth
            buttonClass += "py-3 px-4 md:py-5 md:px-8 ";
            
            if (showAnswer) {
              // When revealed, change colors but keep same padding
              if (isCorrect) {
                // Correct answer - faded green
                buttonClass += "bg-green-100 border-green-400";
              } else if (isSelected) {
                // Selected but wrong - faded red
                buttonClass += "bg-red-100 border-red-400";
              } else {
                // Not selected and wrong - faded gray
                buttonClass += "bg-slate-50 border-slate-200";
              }
            } else {
              // Not revealed yet - normal hover states
              if (isSelected) {
                buttonClass += "text-white border-secondary shadow-lg";
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
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium flex-1">{decodeHtmlEntities(answer)}</span>
                  <span className="w-[60px] flex-shrink-0 flex justify-end items-center">
                    {showAnswer && isCorrect && (
                      <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-bold flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                    {showAnswer && isSelected && !isCorrect && (
                      <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-bold">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </span>
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
      
      {/* Countdown Animation */}
      {randomQuestionRevealed && (
        <div 
          className="mt-6 flex flex-col items-center justify-center"
          style={{ 
            contain: 'layout style paint',
            minHeight: '120px' // Reserve space to prevent layout shifts
          }}
        >
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

