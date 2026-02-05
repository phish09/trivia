"use client";

interface Question {
  id: string;
  text: string;
  answer: number;
  choices?: string[];
  isTrueFalse?: boolean;
  isFillInBlank?: boolean;
  fillInBlankAnswer?: string;
  points: number;
  multiplier?: number;
  hasWager?: boolean;
  source?: string;
  questionOrder?: number;
}

interface PlayerAnswer {
  playerId: string;
  questionId: string;
  answerIndex: number;
  textAnswer?: string;
  isCorrect: boolean;
  pointsEarned: number;
  wager?: number;
}

interface PlayerAnswersViewProps {
  questions: Question[];
  playerAnswers: PlayerAnswer[];
  playerId: string;
  playerUsername: string;
}

export default function PlayerAnswersView({
  questions,
  playerAnswers,
  playerId,
  playerUsername,
}: PlayerAnswersViewProps) {
  const sortedQuestions = [...questions].sort(
    (a, b) => (a.questionOrder || 0) - (b.questionOrder || 0)
  );

  return (
    <div className="space-y-2 max-h-[70vh] overflow-y-auto">
      {sortedQuestions.map((question, index) => {
        const playerAnswer = playerAnswers.find(
          (pa) => pa.playerId === playerId && pa.questionId === question.id
        );

        if (!playerAnswer) {
          // Player didn't answer this question
          let correctAnswerDisplay = "";
          if (question.isTrueFalse) {
            correctAnswerDisplay = question.answer === 0 ? "True" : "False";
          } else if (question.isFillInBlank) {
            correctAnswerDisplay = question.fillInBlankAnswer || "N/A";
          } else {
            correctAnswerDisplay = question.choices?.[question.answer] || "N/A";
          }

          return (
            <div
              key={question.id}
              className="border-2 border-slate-200 rounded-xl p-3 bg-slate-50"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-7 h-7 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs">
                  -
                </span>
                <div className="leading-tight">
                  <span className="font-semibold text-black block text-[.6rem] tracking-wider uppercase">
                    Question {index + 1}
                  </span>
                  <span className="text-xs text-slate-500 block">
                    No answer submitted 😔
                  </span>
                </div>
              </div>
              <p className="text-slate-700 font-bold mb-2 text-sm">{question.text}</p>
              <div className="mt-2">
                <span className="text-xs font-semibold text-slate-600 !leading-tight">
                  Correct answer:
                </span>
                <div className="text-black !leading-tight mt-0.5 text-sm">
                  {correctAnswerDisplay}
                </div>
                {question.source && (
                  <div className="text-xs text-slate-600 mt-1.5 !leading-tight flex items-center gap-1">
                    <svg
                      className="w-3 h-3 text-slate-500 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{question.source}</span>
                  </div>
                )}
              </div>
            </div>
          );
        }

        const isCorrect = playerAnswer.isCorrect === true;
        const pointsEarned = playerAnswer.pointsEarned || 0;
        const hasWager = question.hasWager && playerAnswer.wager;

        // Determine correct answer display
        let correctAnswerDisplay = "";
        if (question.isTrueFalse) {
          correctAnswerDisplay = question.answer === 0 ? "True" : "False";
        } else if (question.isFillInBlank) {
          correctAnswerDisplay = question.fillInBlankAnswer || "N/A";
        } else {
          correctAnswerDisplay = question.choices?.[question.answer] || "N/A";
        }

        // Determine player answer display
        let playerAnswerDisplay = "";
        if (question.isTrueFalse) {
          playerAnswerDisplay =
            playerAnswer.answerIndex === 0 ? "True" : "False";
        } else if (question.isFillInBlank) {
          playerAnswerDisplay = playerAnswer.textAnswer || "No answer";
        } else {
          playerAnswerDisplay =
            question.choices?.[playerAnswer.answerIndex] || "No answer";
        }

        return (
          <div
            key={question.id}
            className={`border-2 rounded-xl p-3 transition-all ${
              isCorrect
                ? "bg-green-50 border-green-300"
                : "bg-red-50 border-red-300"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCorrect ? "bg-green-500" : "bg-red-500"
                  }`}
                >
                  {isCorrect ? (
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="leading-tight">
                    <span className="font-semibold text-black text-[.6rem] tracking-wider uppercase block">
                      Question {index + 1}
                    </span>
                    <span
                      className={`text-xs font-medium block ${
                        isCorrect ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`font-bold text-base ${
                    pointsEarned > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {pointsEarned > 0 ? "+" : ""}
                  {pointsEarned} pts
                </div>
                {hasWager && (
                  <div className="text-xs text-slate-500 mt-0.5">
                    Wager: {playerAnswer.wager}
                  </div>
                )}
              </div>
            </div>

            <p className="text-slate-800 font-bold mb-2 text-sm">{question.text}</p>

            <div>
              <div>
                <span className="text-xs font-semibold text-slate-600">
                  {playerUsername}'s answer:
                </span>
                <div className="mt-0.5 font-medium text-black text-sm">
                  {playerAnswerDisplay}
                </div>
              </div>

              {!isCorrect && (
                <div className="mt-1.5 p-2 rounded-lg bg-white flex flex-col">
                  <span className="text-xs font-semibold text-slate-600 !leading-tight">
                    Correct answer:
                  </span>
                  <div className="text-black !leading-tight text-sm mt-0.5">
                    {correctAnswerDisplay}
                  </div>
                </div>
              )}
              {question.source && (
                <div className="mt-1.5">
                  <div className="text-xs text-slate-600 italic !leading-tight flex items-start gap-1">
                    <svg
                      className="w-3 h-3 text-slate-500 shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{question.source}</span>
                  </div>
                </div>
              )}
            </div>

            {hasWager && (
              <div className="mt-2 pt-2 border-t border-slate-300">
                <p className="text-xs text-slate-600">
                  {isCorrect
                    ? `${playerUsername} wagered ${playerAnswer.wager} points and earned ${pointsEarned} total (${playerAnswer.wager} wager + ${question.points * (question.multiplier || 1)} base)`
                    : `${playerUsername} wagered ${playerAnswer.wager} points and lost ${Math.abs(pointsEarned)} points`}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
