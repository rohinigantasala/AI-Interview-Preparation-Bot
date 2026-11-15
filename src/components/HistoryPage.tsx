import { ArrowLeft, Calendar, FileText, Mic, Keyboard } from 'lucide-react';
import { formatDuration } from '../lib/scoring';
import type { InterviewAttemptSummary } from '../lib/types';

interface HistoryPageProps {
  history: InterviewAttemptSummary[];
  loading: boolean;
  error: string | null;
  onViewReport: (attemptId: number) => void;
  onStartNew: () => void;
  onBackToDashboard: () => void;
}

export function HistoryPage({
  history,
  loading,
  error,
  onViewReport,
  onStartNew,
  onBackToDashboard,
}: HistoryPageProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Dashboard
          </button>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Your Interview History
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            All completed mock interview attempts saved privately to your account.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartNew}
          className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
        >
          Start New Interview
        </button>
      </div>

      {loading ? (
        <div className="mt-6 h-56 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-700">
          {error}
        </div>
      ) : history.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Calendar className="mx-auto h-8 w-8 text-slate-400" aria-hidden="true" />
          <h2 className="mt-3 font-display text-lg font-bold text-slate-900">
            No Completed Interviews Yet
          </h2>
          <p className="mt-1.5 text-sm text-slate-600">
            Complete your first Voice or Text mock interview to inspect saved reports here.
          </p>
          <button
            type="button"
            onClick={onStartNew}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 cursor-pointer"
          >
            Configure First Interview
          </button>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Category &amp; Role</th>
                  <th className="px-5 py-3.5">Mode</th>
                  <th className="px-5 py-3.5 text-right">Duration</th>
                  <th className="px-5 py-3.5 text-right">Score</th>
                  <th className="px-5 py-3.5 text-right">Performance Level</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item) => {
                  const formattedDate = new Date(
                    item.completedAt || item.startedAt,
                  ).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  });

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4 text-slate-600 whitespace-nowrap">{formattedDate}</td>
                      <td className="px-5 py-4 font-medium text-slate-950">
                        {item.interviewType.toUpperCase()} · {item.targetRole}
                        <span className="ml-2 text-xs font-normal capitalize text-slate-500">
                          ({item.difficulty})
                        </span>
                      </td>
                      <td className="px-5 py-4 capitalize text-slate-700">
                        <span className="inline-flex items-center gap-1.5">
                          {item.interviewMode === 'voice' ? (
                            <Mic className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                          ) : (
                            <Keyboard className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
                          )}
                          {item.interviewMode}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-slate-600 tabular-nums">
                        {formatDuration(item.durationSeconds)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-semibold text-slate-950 tabular-nums">
                        {item.totalScore} / {item.maxScore} ({item.percentage}%)
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-800">
                        {item.performanceLevel}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => onViewReport(item.id)}
                          className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                        >
                          <FileText className="h-4 w-4" aria-hidden="true" />
                          View Report
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
