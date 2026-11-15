import { useEffect, useState } from 'react';
import { AlertCircle, PhoneOff, Send } from 'lucide-react';
import { countWords, formatDuration } from '../lib/scoring';
import type { ActiveInterviewSession } from '../lib/types';

interface TextInterviewPageProps {
  session: ActiveInterviewSession | null;
  submitting: boolean;
  serverError: string | null;
  onSubmitAnswer: (answer: string, durationSeconds: number) => Promise<void>;
  onEndInterview: (durationSeconds: number) => Promise<void>;
}

export function TextInterviewPage({
  session,
  submitting,
  serverError,
  onSubmitAnswer,
  onEndInterview,
}: TextInterviewPageProps) {
  const [answer, setAnswer] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  const currentQuestion = session?.questions[session.currentIndex];
  const currentNum = (session?.currentIndex ?? 0) + 1;
  const totalQuestions = session?.questionCount ?? 5;

  useEffect(() => {
    setAnswer('');
    setLocalError(null);
  }, [currentQuestion?.id, session?.currentIndex]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!session || !currentQuestion) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-sm text-slate-600">Loading text interview workspace...</p>
      </div>
    );
  }

  const wordCount = countWords(answer);
  const progressPct = Math.round((currentNum / totalQuestions) * 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim().length === 0) {
      setLocalError('Please enter your answer before submitting.');
      return;
    }
    setLocalError(null);
    await onSubmitAnswer(answer, elapsedSeconds);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Header Progress Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-blue-700">
              {session.interviewType.toUpperCase()} · {session.targetRole} · {currentQuestion.category}
            </p>
            <h1 className="mt-1 font-display text-lg font-bold text-slate-950">
              Text Mock Interview
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-xs font-semibold text-slate-700 tabular-nums">
              {formatDuration(elapsedSeconds)}
            </span>
            <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
              Question {currentNum} of {totalQuestions}
            </span>
            <button
              type="button"
              onClick={() => setShowEndConfirm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 cursor-pointer"
            >
              <PhoneOff className="h-3.5 w-3.5" aria-hidden="true" />
              End
            </button>
          </div>
        </div>

        <div
          role="progressbar"
          aria-valuenow={currentNum}
          aria-valuemin={1}
          aria-valuemax={totalQuestions}
          className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className="h-full rounded-full bg-blue-600 transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Question & Answer Editor */}
      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8"
      >
        <p className="text-xs font-medium text-slate-500">
          Question {currentNum} · Difficulty: {session.difficulty}
        </p>
        <h2
          data-testid="text-question-prompt"
          className="mt-2 font-display text-xl font-bold leading-snug text-slate-950 sm:text-2xl"
        >
          {currentQuestion.prompt}
        </h2>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <label htmlFor="text-answer-box" className="text-sm font-semibold text-slate-800">
              Your Answer
            </label>
            <span
              data-testid="text-word-count"
              className="font-mono text-xs font-semibold text-slate-600 tabular-nums"
            >
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </span>
          </div>

          <textarea
            id="text-answer-box"
            rows={8}
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              if (localError) setLocalError(null);
            }}
            disabled={submitting}
            placeholder="Write a clear, structured answer with concrete examples..."
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-4 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
          />
        </div>

        {(localError || serverError) && (
          <div
            role="alert"
            data-testid="text-answer-error"
            className="mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
            <span>{localError || serverError}</span>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-5">
          <span className="text-xs text-slate-500">
            {submitting
              ? 'AI is evaluating your response across relevance, clarity, and accuracy...'
              : 'Evaluated out of 10 marks per question'}
          </span>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {submitting ? 'Evaluating Answer...' : 'Submit Answer'}
          </button>
        </div>
      </form>

      {/* End Confirmation Modal */}
      {showEndConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="end-text-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h2 id="end-text-modal-title" className="font-display text-lg font-bold text-slate-950">
              End interview early?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {session.answers.length > 0
                ? `You have completed ${session.answers.length} of ${totalQuestions} questions. Ending now will save a report for your answered questions.`
                : 'No answers have been submitted yet. Ending now will discard this attempt.'}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowEndConfirm(false)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Keep Practising
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEndConfirm(false);
                  void onEndInterview(elapsedSeconds);
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 cursor-pointer"
              >
                End Interview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
