import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Code2,
  Keyboard,
  Mic,
  SlidersHorizontal,
} from 'lucide-react';
import type { DifficultyLevel, InterviewMode, InterviewType } from '../lib/types';

interface ConfigureInterviewPageProps {
  initialType?: InterviewType;
  starting: boolean;
  error: string | null;
  onStart: (config: {
    interviewType: InterviewType;
    interviewMode: InterviewMode;
    difficulty: DifficultyLevel;
    questionCount: 5 | 10 | 15;
    targetRole: string;
  }) => Promise<void>;
  onBack: () => void;
}

const ROLE_PRESETS = [
  'Python Developer',
  'Software Developer',
  'Data Analyst',
  'Machine Learning Engineer',
  'Full Stack Developer',
];

export function ConfigureInterviewPage({
  initialType = 'hr',
  starting,
  error,
  onStart,
  onBack,
}: ConfigureInterviewPageProps) {
  const [interviewType, setInterviewType] = useState<InterviewType>(initialType);
  const [interviewMode, setInterviewMode] = useState<InterviewMode>('voice');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('intermediate');
  const [questionCount, setQuestionCount] = useState<5 | 10 | 15>(5);
  const [targetRole, setTargetRole] = useState('Python Developer');
  const [roleError, setRoleError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (interviewType === 'custom' && targetRole.trim().length < 2) {
      setRoleError('Please enter your target job role for a custom interview.');
      return;
    }
    setRoleError(null);
    await onStart({
      interviewType,
      interviewMode,
      difficulty,
      questionCount,
      targetRole:
        interviewType === 'custom'
          ? targetRole.trim()
          : interviewType === 'hr'
            ? 'Graduate / Entry-Level Candidate'
            : 'Software Developer',
    });
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Dashboard
      </button>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-950">
          Configure Your Mock Interview
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Choose your interview focus, Voice or Text mode, difficulty level, and session length.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-7">
          {/* 1. Interview Type */}
          <div>
            <span className="block text-sm font-semibold text-slate-900">1. Interview Type</span>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  id: 'hr' as const,
                  title: 'HR Interview',
                  desc: 'Communication & behavioral fit',
                  icon: Briefcase,
                },
                {
                  id: 'technical' as const,
                  title: 'Technical Interview',
                  desc: 'Python, SQL & problem solving',
                  icon: Code2,
                },
                {
                  id: 'custom' as const,
                  title: 'Custom Interview',
                  desc: 'Tailored to your target role',
                  icon: SlidersHorizontal,
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = interviewType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setInterviewType(opt.id)}
                    className={`rounded-xl border p-4 text-left transition-all cursor-pointer ${
                      active
                        ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-100'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${active ? 'text-blue-600' : 'text-slate-500'}`}
                      aria-hidden="true"
                    />
                    <p className="mt-3 font-display text-sm font-bold text-slate-950">
                      {opt.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Target Job Role */}
          {interviewType === 'custom' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <label htmlFor="target-role-input" className="block text-sm font-semibold text-slate-900">
                Target Job Role
              </label>
              <input
                id="target-role-input"
                type="text"
                value={targetRole}
                onChange={(e) => {
                  setTargetRole(e.target.value);
                  setRoleError(null);
                }}
                placeholder="e.g., Python Developer, Data Analyst"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {ROLE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setTargetRole(preset);
                      setRoleError(null);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                      targetRole === preset
                        ? 'bg-blue-600 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              {roleError && <p className="mt-2 text-xs font-medium text-red-600">{roleError}</p>}
            </div>
          )}

          {/* 2. Interview Mode */}
          <div>
            <span className="block text-sm font-semibold text-slate-900">2. Interview Mode</span>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setInterviewMode('voice')}
                className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                  interviewMode === 'voice'
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-100'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Mic className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-slate-950">Voice Interview</p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    One-on-one spoken AI interviewer with live speech transcription &amp; text fallback.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setInterviewMode('text')}
                className={`flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all cursor-pointer ${
                  interviewMode === 'text'
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-100'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white">
                  <Keyboard className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-slate-950">Text Interview</p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Focused written editor with instant AI scoring and structured coaching feedback.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 3. Difficulty & Question Count */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <span className="block text-sm font-semibold text-slate-900">3. Difficulty</span>
              <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1">
                {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`rounded-lg py-2 text-xs font-semibold capitalize transition-colors cursor-pointer ${
                      difficulty === lvl
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-sm font-semibold text-slate-900">
                4. Number of Questions
              </span>
              <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1">
                {([5, 10, 15] as const).map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`rounded-lg py-2 font-mono text-xs font-semibold transition-colors cursor-pointer ${
                      questionCount === cnt
                        ? 'bg-white text-slate-950 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {cnt} Questions
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="border-t border-slate-200 pt-5">
            <button
              type="submit"
              disabled={starting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-60 sm:w-auto cursor-pointer"
            >
              {starting ? 'Preparing Interview Questions...' : 'Start Interview'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
