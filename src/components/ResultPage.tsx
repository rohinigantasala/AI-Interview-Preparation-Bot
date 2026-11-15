import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  Info,
  RotateCcw,
  Target,
  TrendingUp,
} from 'lucide-react';
import { formatDuration } from '../lib/scoring';
import type { FinalInterviewReport, PerformanceLevel } from '../lib/types';

interface ResultPageProps {
  report: FinalInterviewReport | null;
  loading: boolean;
  error: string | null;
  onRetake: (report: FinalInterviewReport) => Promise<void>;
  onPractiseWeakAreas: (report: FinalInterviewReport) => Promise<void>;
  onBackToDashboard: () => void;
}

function getLevelMeta(level: PerformanceLevel) {
  switch (level) {
    case 'Excellent':
      return { text: 'text-emerald-700', bar: 'bg-emerald-600', Icon: Award };
    case 'Good':
      return { text: 'text-blue-700', bar: 'bg-blue-600', Icon: CheckCircle2 };
    case 'Average':
      return { text: 'text-amber-700', bar: 'bg-amber-600', Icon: TrendingUp };
    default:
      return { text: 'text-red-700', bar: 'bg-red-600', Icon: Target };
  }
}

export function ResultPage({
  report,
  loading,
  error,
  onRetake,
  onPractiseWeakAreas,
  onBackToDashboard,
}: ResultPageProps) {
  if (loading && !report) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <div className="h-10 w-72 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-6 h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h1 className="font-display text-lg font-bold text-slate-950">Report Unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">{error || 'Unable to load report.'}</p>
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

  const levelMeta = getLevelMeta(report.performanceLevel);
  const LevelIcon = levelMeta.Icon;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Header & Three Action Buttons */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold text-blue-700">
            {report.interviewType.toUpperCase()} · {report.interviewMode.toUpperCase()} ·{' '}
            {report.targetRole}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Final Interview Performance Report
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onRetake(report)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Retake Interview
          </button>
          <button
            type="button"
            onClick={() => onPractiseWeakAreas(report)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 whitespace-nowrap cursor-pointer"
          >
            <Target className="h-4 w-4" aria-hidden="true" />
            Practise Weak Areas
          </button>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 whitespace-nowrap cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Return to Dashboard
          </button>
        </div>
      </div>

      {/* Evaluation Mode Notice */}
      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
        <span>{report.evaluationNotice}</span>
      </div>

      {/* Top Metrics */}
      <section className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Score</p>
          <p
            data-testid="report-total-score"
            className="mt-2 font-mono text-3xl font-bold text-slate-950 tabular-nums"
          >
            {report.totalScore}{' '}
            <span className="text-base font-normal text-slate-500">/ {report.maxScore}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Percentage</p>
          <p
            data-testid="report-percentage"
            className="mt-2 font-mono text-3xl font-bold text-slate-950 tabular-nums"
          >
            {report.percentage}%
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${levelMeta.bar}`}
              style={{ width: `${Math.min(100, report.percentage)}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Performance Level</p>
          <div className="mt-2 flex items-center gap-2">
            <LevelIcon className={`h-5 w-5 shrink-0 ${levelMeta.text}`} aria-hidden="true" />
            <span
              data-testid="report-level"
              className={`font-display text-xl font-bold ${levelMeta.text}`}
            >
              {report.performanceLevel}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Practice Time</p>
          <div className="mt-2 flex items-center gap-2 text-slate-950">
            <Clock className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <span className="font-mono text-2xl font-bold tabular-nums">
              {formatDuration(report.durationSeconds)}
            </span>
          </div>
        </div>
      </section>

      {/* Question-Wise Performance Visual Chart */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-display text-base font-bold text-slate-950">
          Question-Wise Score Analysis (Out of 10)
        </h2>
        <div className="mt-5 flex h-44 items-end gap-3 border-b border-slate-200 pb-3">
          {report.answers.map((ans, idx) => (
            <div key={ans.questionId} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="font-mono text-xs font-semibold text-slate-800 tabular-nums">
                {ans.score}/10
              </span>
              <div className="flex h-32 w-full items-end justify-center">
                <div
                  className={`w-full max-w-[44px] rounded-t-lg transition-all ${
                    ans.score >= 8
                      ? 'bg-emerald-500'
                      : ans.score >= 5
                        ? 'bg-blue-600'
                        : 'bg-amber-500'
                  }`}
                  style={{ height: `${Math.max(8, ans.score * 10)}%` }}
                  title={`Q${idx + 1}: ${ans.score}/10`}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-3">
          {report.answers.map((ans, idx) => (
            <div key={ans.questionId} className="flex-1 text-center font-mono text-xs text-slate-500">
              Q{idx + 1}
            </div>
          ))}
        </div>
      </section>

      {/* Coaching Insights Grid */}
      <section className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-base font-bold text-slate-950">Strongest Areas</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {report.strongestAreas.map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>

          <h2 className="mt-6 font-display text-base font-bold text-slate-950">
            Communication Feedback
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">
            {report.communicationFeedback}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-display text-base font-bold text-slate-950">Weakest Areas</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {report.weakestAreas.map((item, i) => (
              <li key={i}>• {item}</li>
            ))}
          </ul>

          <h2 className="mt-6 font-display text-base font-bold text-slate-950">
            Technical Knowledge Feedback
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{report.technicalFeedback}</p>
        </div>
      </section>

      {/* Personalized Improvement Plan */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-display text-base font-bold text-slate-950">
          Personalized Improvement Plan
        </h2>
        <ol className="mt-3 space-y-2 text-sm text-slate-700">
          {report.improvementPlan.map((step, i) => (
            <li key={i}>
              <strong className="font-mono text-blue-700">{i + 1}.</strong> {step}
            </li>
          ))}
        </ol>
      </section>

      {/* Question-by-Question AI Feedback */}
      <section className="mt-8 space-y-4">
        <h2 className="font-display text-lg font-bold text-slate-950">
          Question-by-Question Feedback
        </h2>
        {report.answers.map((ans, idx) => (
          <article key={ans.questionId} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Question {idx + 1} · {ans.category} · {ans.evaluationLabel}
                </p>
                <h3 className="mt-1 font-display text-base font-bold text-slate-950">
                  {ans.questionPrompt}
                </h3>
              </div>
              <span className="font-mono text-lg font-bold text-slate-950 tabular-nums">
                {ans.score} / 10
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-slate-500">Your Answer</p>
                <p className="mt-1 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
                  {ans.submittedAnswer}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Evaluation Feedback</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">
                  {ans.summaryFeedback}
                </p>
                {ans.suggestedImprovements[0] && (
                  <p className="mt-2 text-xs text-slate-600">
                    <strong className="text-slate-800">Next step:</strong>{' '}
                    {ans.suggestedImprovements[0]}
                  </p>
                )}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
