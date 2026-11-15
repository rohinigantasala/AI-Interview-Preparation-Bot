import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Sparkles,
} from 'lucide-react';
import type { QuestionEvaluation } from '../lib/types';

interface FeedbackPageProps {
  evaluation: QuestionEvaluation | null;
  questionNumber: number;
  totalQuestions: number;
  loadingNext: boolean;
  onNextQuestion: () => Promise<void>;
  onBackToDashboard: () => void;
}

export function FeedbackPage({
  evaluation,
  questionNumber,
  totalQuestions,
  loadingNext,
  onNextQuestion,
  onBackToDashboard,
}: FeedbackPageProps) {
  if (!evaluation) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="font-display text-lg font-bold text-slate-950">No Evaluation Loaded</h1>
          <p className="mt-2 text-sm text-slate-600">
            Submit an answer in an interview session to view detailed coaching feedback.
          </p>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const pct = Math.round((evaluation.score / evaluation.maxScore) * 100);
  const isLast = questionNumber >= totalQuestions;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-blue-700">
            {evaluation.category} · Question {questionNumber} of {totalQuestions}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-slate-950">
            Answer Evaluation &amp; Coaching
          </h1>
        </div>
        <span className="text-xs font-semibold text-slate-600">{evaluation.evaluationLabel}</span>
      </div>

      {evaluation.fallbackNotice && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <span>{evaluation.fallbackNotice}</span>
        </div>
      )}

      {/* Score & Question Summary */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:col-span-4">
          <p className="text-xs font-medium text-slate-500">Answer Score</p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span
              data-testid="feedback-score"
              className="font-mono text-4xl font-bold text-slate-950 tabular-nums"
            >
              {evaluation.score}
            </span>
            <span className="font-mono text-lg text-slate-500 tabular-nums">
              / {evaluation.maxScore}
            </span>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${
                evaluation.score >= 8
                  ? 'bg-emerald-600'
                  : evaluation.score >= 5
                    ? 'bg-blue-600'
                    : 'bg-amber-600'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Word Count:{' '}
            <strong className="font-mono text-slate-800">{evaluation.wordCount} words</strong>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:col-span-8">
          <p className="text-xs font-medium text-slate-500">Question</p>
          <h2 className="mt-1 font-display text-lg font-bold text-slate-950">
            {evaluation.questionPrompt}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            {evaluation.summaryFeedback}
          </p>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-800">
            <span className="block text-xs font-semibold text-slate-500">Your Answer</span>
            <p className="mt-1 whitespace-pre-wrap">{evaluation.submittedAnswer}</p>
          </div>
        </div>
      </div>

      {/* Strengths, Weaknesses, Missing Points & Improvements */}
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="flex items-center gap-2 font-display text-base font-bold text-slate-950">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            Strengths
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {evaluation.strengths.map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>

          <h3 className="mt-5 flex items-center gap-2 font-display text-base font-bold text-slate-950">
            <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden="true" />
            Weaknesses &amp; Missing Points
          </h3>
          <ul className="mt-2.5 space-y-2 text-sm text-slate-700">
            {evaluation.weaknesses.map((item, i) => (
              <li key={`w-${i}`}>• {item}</li>
            ))}
            {evaluation.missingPoints.map((item, i) => (
              <li key={`m-${i}`} className="text-slate-600">
                • Missing concept: {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="flex items-center gap-2 font-display text-base font-bold text-slate-950">
            <Lightbulb className="h-4 w-4 text-blue-600" aria-hidden="true" />
            Suggested Improvements
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {evaluation.suggestedImprovements.map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>

          {evaluation.strongerAnswerExample && (
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-blue-800">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Example of a Stronger Answer
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-800">
                {evaluation.strongerAnswerExample}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          Return to Dashboard
        </button>

        <button
          type="button"
          onClick={onNextQuestion}
          disabled={loadingNext}
          data-testid="feedback-next-button"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
        >
          {loadingNext
            ? 'Loading...'
            : isLast
              ? 'Generate Final Report'
              : 'Next Question'}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
