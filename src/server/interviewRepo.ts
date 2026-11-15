import { db } from './db';
import {
  generateFinalReportWithGemini,
  isGeminiConfigured,
  maybeGenerateFollowUpQuestion,
} from './geminiService';
import type {
  ActiveInterviewSession,
  AuthUser,
  DashboardSummary,
  DifficultyLevel,
  FinalInterviewReport,
  InterviewAttemptSummary,
  InterviewMode,
  InterviewQuestionItem,
  InterviewType,
  PerformanceLevel,
  QuestionEvaluation,
} from '../lib/types';

interface AttemptRow {
  id: number;
  user_id: number;
  interview_type: InterviewType;
  interview_mode: InterviewMode;
  difficulty: DifficultyLevel;
  target_role: string;
  question_count: number;
  current_index: number;
  status: 'in_progress' | 'awaiting_next' | 'completed' | 'ended_early';
  questions_json: string;
  answers_json: string;
  total_score: number;
  max_score: number;
  percentage: number;
  performance_level: PerformanceLevel;
  duration_seconds: number;
  report_json: string | null;
  started_at: string;
  completed_at: string | null;
}

function rowToActiveSession(row: AttemptRow): ActiveInterviewSession {
  return {
    attemptId: row.id,
    interviewType: row.interview_type,
    interviewMode: row.interview_mode,
    difficulty: row.difficulty,
    targetRole: row.target_role,
    questionCount: row.question_count,
    currentIndex: row.current_index,
    status: row.status,
    questions: JSON.parse(row.questions_json) as InterviewQuestionItem[],
    answers: JSON.parse(row.answers_json) as QuestionEvaluation[],
    startedAt: row.started_at,
    aiConfigured: isGeminiConfigured(),
  };
}

export function createInterviewAttempt(params: {
  userId: number;
  interviewType: InterviewType;
  interviewMode: InterviewMode;
  difficulty: DifficultyLevel;
  targetRole: string;
  questions: InterviewQuestionItem[];
}): ActiveInterviewSession {
  const now = new Date().toISOString();
  const res = db
    .prepare(
      `INSERT INTO interview_attempts (
        user_id, interview_type, interview_mode, difficulty, target_role,
        question_count, current_index, status, questions_json, answers_json,
        total_score, max_score, percentage, performance_level, duration_seconds, started_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 'in_progress', ?, '[]', 0, ?, 0, 'Needs Improvement', 0, ?)`,
    )
    .run(
      params.userId,
      params.interviewType,
      params.interviewMode,
      params.difficulty,
      params.targetRole,
      params.questions.length,
      JSON.stringify(params.questions),
      params.questions.length * 10,
      now,
    );

  const attemptId = Number(res.lastInsertRowid);
  const row = db
    .prepare('SELECT * FROM interview_attempts WHERE id = ? AND user_id = ?')
    .get(attemptId, params.userId) as unknown as AttemptRow | undefined;

  if (!row) {
    throw new Error('Failed to create interview attempt.');
  }

  return rowToActiveSession(row);
}

export function getAttemptForUser(
  attemptId: number,
  userId: number,
): AttemptRow | null {
  const row = db
    .prepare('SELECT * FROM interview_attempts WHERE id = ? AND user_id = ?')
    .get(attemptId, userId) as AttemptRow | undefined;
  return row ?? null;
}

export function getActiveAttemptForUser(
  userId: number,
): ActiveInterviewSession | null {
  const row = db
    .prepare(
      `SELECT * FROM interview_attempts
       WHERE user_id = ? AND status IN ('in_progress', 'awaiting_next')
       ORDER BY id DESC LIMIT 1`,
    )
    .get(userId) as AttemptRow | undefined;

  return row ? rowToActiveSession(row) : null;
}

export function saveQuestionEvaluation(params: {
  attemptId: number;
  userId: number;
  evaluation: QuestionEvaluation;
  durationSeconds: number;
}): ActiveInterviewSession {
  const row = getAttemptForUser(params.attemptId, params.userId);
  if (!row) {
    throw new Error('Interview attempt not found.');
  }

  const answers = JSON.parse(row.answers_json) as QuestionEvaluation[];
  const existingIdx = answers.findIndex(
    (a) => a.questionIndex === params.evaluation.questionIndex,
  );
  if (existingIdx >= 0) {
    throw new Error('This question has already been answered.');
  }

  answers.push(params.evaluation);
  const nextStatus =
    row.interview_mode === 'voice' ? 'in_progress' : 'awaiting_next';

  db.prepare(
    `UPDATE interview_attempts
     SET answers_json = ?, status = ?, duration_seconds = ?
     WHERE id = ? AND user_id = ?`,
  ).run(
    JSON.stringify(answers),
    nextStatus,
    Math.max(row.duration_seconds, Math.floor(params.durationSeconds)),
    params.attemptId,
    params.userId,
  );

  const updated = getAttemptForUser(params.attemptId, params.userId)!;
  return rowToActiveSession(updated);
}

export async function advanceOrCompleteAttempt(params: {
  attemptId: number;
  userId: number;
  durationSeconds: number;
  allowAdaptiveFollowUp?: boolean;
}): Promise<{
  completed: boolean;
  session: ActiveInterviewSession;
  report?: FinalInterviewReport;
}> {
  const row = getAttemptForUser(params.attemptId, params.userId);
  if (!row) {
    throw new Error('Interview attempt not found.');
  }

  const questions = JSON.parse(row.questions_json) as InterviewQuestionItem[];
  const answers = JSON.parse(row.answers_json) as QuestionEvaluation[];

  if (row.status === 'completed' && row.report_json) {
    return {
      completed: true,
      session: rowToActiveSession(row),
      report: JSON.parse(row.report_json) as FinalInterviewReport,
    };
  }

  if (answers.length <= row.current_index) {
    throw new Error('Please answer the current question before moving forward.');
  }

  const nextDuration = Math.max(row.duration_seconds, Math.floor(params.durationSeconds));

  if (row.current_index >= questions.length - 1) {
    const report = await generateFinalReportWithGemini({
      attemptId: row.id,
      interviewType: row.interview_type,
      interviewMode: row.interview_mode,
      difficulty: row.difficulty,
      targetRole: row.target_role,
      questionCount: row.question_count,
      durationSeconds: nextDuration,
      answers,
    });

    db.prepare(
      `UPDATE interview_attempts
       SET status = 'completed',
           total_score = ?,
           max_score = ?,
           percentage = ?,
           performance_level = ?,
           duration_seconds = ?,
           report_json = ?,
           completed_at = ?
       WHERE id = ? AND user_id = ?`,
    ).run(
      report.totalScore,
      report.maxScore,
      report.percentage,
      report.performanceLevel,
      nextDuration,
      JSON.stringify(report),
      report.completedAt,
      row.id,
      params.userId,
    );

    const updated = getAttemptForUser(row.id, params.userId)!;
    return {
      completed: true,
      session: rowToActiveSession(updated),
      report,
    };
  }

  const nextIdx = row.current_index + 1;
  if (params.allowAdaptiveFollowUp && answers.length > 0 && nextIdx < questions.length) {
    const prevAnswer = answers[answers.length - 1];
    const prevQ = questions[row.current_index];
    const plannedNext = questions[nextIdx];
    if (!prevQ.isFollowUp && prevAnswer.score < 6) {
      questions[nextIdx] = await maybeGenerateFollowUpQuestion({
        previousQuestion: prevQ,
        previousAnswer: prevAnswer.submittedAnswer,
        nextPlannedQuestion: plannedNext,
        interviewType: row.interview_type,
        targetRole: row.target_role,
      });
    }
  }

  db.prepare(
    `UPDATE interview_attempts
     SET current_index = ?, status = 'in_progress', questions_json = ?, duration_seconds = ?
     WHERE id = ? AND user_id = ?`,
  ).run(
    nextIdx,
    JSON.stringify(questions),
    nextDuration,
    row.id,
    params.userId,
  );

  const updated = getAttemptForUser(row.id, params.userId)!;
  return {
    completed: false,
    session: rowToActiveSession(updated),
  };
}

export async function endAttemptEarly(params: {
  attemptId: number;
  userId: number;
  durationSeconds: number;
}): Promise<{ finalized: boolean; report?: FinalInterviewReport }> {
  const row = getAttemptForUser(params.attemptId, params.userId);
  if (!row) {
    throw new Error('Interview attempt not found.');
  }

  const answers = JSON.parse(row.answers_json) as QuestionEvaluation[];
  const nextDuration = Math.max(row.duration_seconds, Math.floor(params.durationSeconds));

  if (answers.length === 0) {
    db.prepare(
      `UPDATE interview_attempts
       SET status = 'ended_early', duration_seconds = ?, completed_at = ?
       WHERE id = ? AND user_id = ?`,
    ).run(nextDuration, new Date().toISOString(), row.id, params.userId);
    return { finalized: false };
  }

  const report = await generateFinalReportWithGemini({
    attemptId: row.id,
    interviewType: row.interview_type,
    interviewMode: row.interview_mode,
    difficulty: row.difficulty,
    targetRole: row.target_role,
    questionCount: row.question_count,
    durationSeconds: nextDuration,
    answers,
  });

  db.prepare(
    `UPDATE interview_attempts
     SET status = 'completed',
         total_score = ?,
         max_score = ?,
         percentage = ?,
         performance_level = ?,
         duration_seconds = ?,
         report_json = ?,
         completed_at = ?
     WHERE id = ? AND user_id = ?`,
  ).run(
    report.totalScore,
    report.maxScore,
    report.percentage,
    report.performanceLevel,
    nextDuration,
    JSON.stringify(report),
    report.completedAt,
    row.id,
    params.userId,
  );

  return { finalized: true, report };
}

export function getSavedReportForUser(
  attemptId: number,
  userId: number,
): FinalInterviewReport | null {
  const row = getAttemptForUser(attemptId, userId);
  if (!row || !row.report_json) return null;
  return JSON.parse(row.report_json) as FinalInterviewReport;
}

export function getHistoryForUser(userId: number): InterviewAttemptSummary[] {
  const rows = db
    .prepare(
      `SELECT id, interview_type, interview_mode, difficulty, target_role,
              question_count, total_score, max_score, percentage,
              performance_level, duration_seconds, status, started_at, completed_at
       FROM interview_attempts
       WHERE user_id = ? AND status = 'completed'
       ORDER BY id DESC`,
    )
    .all(userId) as Array<{
    id: number;
    interview_type: InterviewType;
    interview_mode: InterviewMode;
    difficulty: DifficultyLevel;
    target_role: string;
    question_count: number;
    total_score: number;
    max_score: number;
    percentage: number;
    performance_level: PerformanceLevel;
    duration_seconds: number;
    status: 'completed';
    started_at: string;
    completed_at: string | null;
  }>;

  return rows.map((r) => ({
    id: r.id,
    interviewType: r.interview_type,
    interviewMode: r.interview_mode,
    difficulty: r.difficulty,
    targetRole: r.target_role,
    questionCount: r.question_count,
    totalScore: r.total_score,
    maxScore: r.max_score,
    percentage: r.percentage,
    performanceLevel: r.performance_level,
    durationSeconds: r.duration_seconds,
    status: r.status,
    startedAt: r.started_at,
    completedAt: r.completed_at,
  }));
}

export function buildUserDashboard(user: AuthUser): DashboardSummary {
  const history = getHistoryForUser(user.id);
  const completedCount = history.length;

  let averageScore: number | null = null;
  let averagePercentage: number | null = null;
  let bestScore: number | null = null;
  let bestPercentage: number | null = null;

  if (completedCount > 0) {
    const sumPct = history.reduce((acc, h) => acc + h.percentage, 0);
    const sumTen = history.reduce(
      (acc, h) => acc + (h.maxScore > 0 ? (h.totalScore / h.maxScore) * 10 : 0),
      0,
    );
    averagePercentage = Math.round((sumPct / completedCount) * 10) / 10;
    averageScore = Math.round((sumTen / completedCount) * 10) / 10;
    bestPercentage = Math.max(...history.map((h) => h.percentage));
    bestScore = Math.max(
      ...history.map((h) =>
        h.maxScore > 0 ? Math.round((h.totalScore / h.maxScore) * 100) / 10 : 0,
      ),
    );
  }

  const allAttempts = db
    .prepare('SELECT COALESCE(SUM(duration_seconds), 0) AS total_sec FROM interview_attempts WHERE user_id = ?')
    .get(user.id) as { total_sec: number };

  const progressPoints = [...history]
    .slice(0, 8)
    .reverse()
    .map((h, idx) => ({
      label: `#${idx + 1} ${h.interviewType.toUpperCase()}`,
      percentage: h.percentage,
      scoreLabel: `${h.totalScore}/${h.maxScore}`,
      type: h.interviewType,
    }));

  const recommendedFocus: string[] = [];
  if (completedCount === 0) {
    recommendedFocus.push(
      'Start your first 5-question Voice or Text HR interview to establish your communication baseline.',
      'Try an Intermediate Technical interview to test Python, SQL, and algorithm explanations.',
    );
  } else {
    const latestReport = getSavedReportForUser(history[0].id, user.id);
    if (latestReport?.weakestAreas.length) {
      recommendedFocus.push(...latestReport.weakestAreas.slice(0, 3));
    }
    if (recommendedFocus.length === 0) {
      recommendedFocus.push('Challenge yourself with an Advanced Custom Role interview.');
    }
  }

  return {
    user,
    stats: {
      interviewsCompleted: completedCount,
      averageScore,
      averagePercentage,
      bestScore,
      bestPercentage,
      totalPracticeSeconds: Number(allAttempts?.total_sec ?? 0),
    },
    recentHistory: history.slice(0, 5),
    progressPoints,
    recommendedFocus,
    activeAttempt: getActiveAttemptForUser(user.id),
    aiConfigured: isGeminiConfigured(),
  };
}
