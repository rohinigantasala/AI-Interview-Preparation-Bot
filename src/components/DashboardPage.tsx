import {
  ArrowRight,
  Award,
  BarChart3,
  Briefcase,
  CheckCircle2,
  Clock,
  Code2,
  Mic,
  Play,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import { formatDuration } from '../lib/scoring';
import type { DashboardSummary, InterviewType } from '../lib/types';

interface DashboardPageProps {
  data: DashboardSummary | null;
  loading: boolean;
  error: string | null;
  onStartPreset: (type: InterviewType) => void;
  onResumeActive: (attemptId: number, mode: 'voice' | 'text') => void;
  onViewReport: (attemptId: number) => void;
  onNavigate: (path: string) => void;
  onRetry: () => void;
}

export function DashboardPage({
  data,
  loading,
  error,
  onStartPreset,
  onResumeActive,
  onViewReport,
  onNavigate,
  onRetry,
}: DashboardPageProps) {
  if (loading && !data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="h-9 w-72 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-red-200 bg-white p-6">
          <h1 className="font-display text-lg font-bold text-slate-900">Dashboard Error</h1>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { user, stats, recentHistory, progressPoints, recommendedFocus, activeAttempt } = data;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Welcome Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#0B1437] via-[#13266B] to-[#3B1E7A] p-6 text-white shadow-md sm:flex-row sm:items-center sm:p-8">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome back, {user.fullName}!
          </h1>
          <p className="mt-1.5 text-sm text-blue-100 sm:text-base">
            What would you like to practise today?
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('/configure')}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0B1437] shadow-sm transition-transform hover:-translate-y-0.5 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Mic className="h-4 w-4 text-blue-600" aria-hidden="true" />
          Configure New Interview
        </button>
      </div>

      {/* Resume Active Session Banner if present */}
      {activeAttempt && (
        <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50/70 px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-semibold text-blue-700">In-Progress Session Saved</p>
            <p className="mt-0.5 text-sm font-medium text-slate-900">
              {activeAttempt.interviewType.toUpperCase()} ({activeAttempt.interviewMode} mode ·{' '}
              {activeAttempt.targetRole}) — Question {activeAttempt.currentIndex + 1} of{' '}
              {activeAttempt.questionCount}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onResumeActive(activeAttempt.attemptId, activeAttempt.interviewMode)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            Resume Interview
          </button>
        </div>
      )}

      {/* 3 Primary Practice Cards */}
      <section aria-label="Interview practice tracks" className="mt-8">
        <h2 className="font-display text-lg font-bold text-slate-950">
          What would you like to practise today?
        </h2>

        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Card 1: HR Interview */}
          <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Briefcase className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-4 text-xs font-semibold tracking-wide text-blue-700">HR INTERVIEW</p>
              <h3 className="mt-1 font-display text-xl font-bold text-slate-950">
                HR &amp; Behavioral
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Improve your communication and confidence.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStartPreset('hr')}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
            >
              Start HR Interview
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </article>

          {/* Card 2: Technical Interview */}
          <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <Code2 className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-4 text-xs font-semibold tracking-wide text-violet-700">
                TECHNICAL INTERVIEW
              </p>
              <h3 className="mt-1 font-display text-xl font-bold text-slate-950">
                Technical Concepts
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Test your programming and technical knowledge.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStartPreset('technical')}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-800 cursor-pointer"
            >
              Start Technical Interview
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </article>

          {/* Card 3: Custom Interview */}
          <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-xs transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
                <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
              </div>
              <p className="mt-4 text-xs font-semibold tracking-wide text-slate-600">
                CUSTOM INTERVIEW
              </p>
              <h3 className="mt-1 font-display text-xl font-bold text-slate-950">
                Target Role Prep
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Practise based on your target job role.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStartPreset('custom')}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B1437] px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 cursor-pointer"
            >
              Create Interview
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </article>
        </div>
      </section>

      {/* 4 Live User Statistics */}
      <section aria-label="User interview statistics" className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Interviews Completed</span>
            <CheckCircle2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </div>
          <p
            data-testid="stat-completed"
            className="mt-3 font-mono text-3xl font-bold text-slate-950 tabular-nums"
          >
            {stats.interviewsCompleted}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Average Score</span>
            <BarChart3 className="h-4 w-4 text-violet-600" aria-hidden="true" />
          </div>
          <p
            data-testid="stat-average"
            className="mt-3 font-mono text-3xl font-bold text-slate-950 tabular-nums"
          >
            {stats.averageScore !== null ? `${stats.averageScore} / 10` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.averagePercentage !== null ? `${stats.averagePercentage}% avg` : 'No attempts yet'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Best Performance</span>
            <Award className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </div>
          <p
            data-testid="stat-best"
            className="mt-3 font-mono text-3xl font-bold text-slate-950 tabular-nums"
          >
            {stats.bestPercentage !== null ? `${stats.bestPercentage}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {stats.bestPercentage !== null ? 'Highest session score' : 'Complete 1 session'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Total Practice Time</span>
            <Clock className="h-4 w-4 text-blue-600" aria-hidden="true" />
          </div>
          <p
            data-testid="stat-time"
            className="mt-3 font-mono text-3xl font-bold text-slate-950 tabular-nums"
          >
            {formatDuration(stats.totalPracticeSeconds)}
          </p>
        </div>
      </section>

      {/* Progress Chart + Recommended Improvements */}
      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Progress Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-slate-950">
                Score Progress Chart
              </h2>
              <p className="text-xs text-slate-500">
                Your percentage trend across completed mock interviews
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-blue-600" aria-hidden="true" />
          </div>

          {progressPoints.length === 0 ? (
            <div className="mt-6 flex h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm font-medium text-slate-700">No completed sessions yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Finish an interview to plot your real score progression here.
              </p>
            </div>
          ) : (
            <div className="mt-6">
              <div className="flex h-44 items-end gap-3 border-b border-slate-200 pb-3">
                {progressPoints.map((pt, idx) => (
                  <div key={idx} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="font-mono text-[11px] font-semibold text-slate-700 tabular-nums">
                      {pt.percentage}%
                    </span>
                    <div className="flex h-32 w-full items-end justify-center">
                      <div
                        className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-blue-600 to-violet-500 transition-all"
                        style={{ height: `${Math.max(8, pt.percentage)}%` }}
                        title={`${pt.label}: ${pt.scoreLabel} (${pt.percentage}%)`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex gap-3">
                {progressPoints.map((pt, idx) => (
                  <div key={idx} className="flex-1 truncate text-center font-mono text-[11px] text-slate-500">
                    {pt.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recommended Areas to Improve */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <h2 className="font-display text-base font-bold text-slate-950">
            Recommended Areas to Improve
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Derived directly from your saved interview sessions
          </p>

          <ul className="mt-5 space-y-3">
            {recommendedFocus.map((tip, i) => (
              <li
                key={i}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700"
              >
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Recent Interview History */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-950">
              Recent Interview History
            </h2>
            <p className="text-xs text-slate-500">Your latest saved mock interview attempts</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/history')}
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            View All History
          </button>
        </div>

        {recentHistory.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">
            No completed interviews recorded yet. Start your first Voice or Text interview above.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-medium text-slate-500">
                  <th className="py-2.5 pr-4">Category</th>
                  <th className="py-2.5 pr-4">Mode</th>
                  <th className="py-2.5 pr-4 text-right">Score</th>
                  <th className="py-2.5 pr-4 text-right">Level</th>
                  <th className="py-2.5 text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-medium text-slate-900">
                      {item.interviewType.toUpperCase()} · {item.targetRole}
                    </td>
                    <td className="py-3 pr-4 capitalize text-slate-600">{item.interviewMode}</td>
                    <td className="py-3 pr-4 text-right font-mono text-slate-900 tabular-nums">
                      {item.totalScore} / {item.maxScore} ({item.percentage}%)
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-slate-800">
                      {item.performanceLevel}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onViewReport(item.id)}
                        className="font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                      >
                        View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
