import express, { type Request, type Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { createServer as createViteServer } from 'vite';
import {
  clearAuthCookie,
  deleteAuthSession,
  extractAuthToken,
  getAuthenticatedUser,
  loginUser,
  registerUser,
  setAuthCookie,
} from './src/server/auth';
import {
  evaluateAnswerWithGemini,
  generateInterviewQuestions,
  isGeminiConfigured,
} from './src/server/geminiService';
import {
  advanceOrCompleteAttempt,
  buildUserDashboard,
  createInterviewAttempt,
  endAttemptEarly,
  getActiveAttemptForUser,
  getAttemptForUser,
  getHistoryForUser,
  getSavedReportForUser,
  saveQuestionEvaluation,
} from './src/server/interviewRepo';
import { validateNonEmptyAnswer } from './src/lib/scoring';
import type {
  DifficultyLevel,
  InterviewMode,
  InterviewQuestionItem,
  InterviewType,
} from './src/lib/types';

const PORT = 3000;

function requireAuth(req: Request, res: Response) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return null;
  }
  return user;
}

function isInterviewType(val: unknown): val is InterviewType {
  return val === 'hr' || val === 'technical' || val === 'custom';
}

function isInterviewMode(val: unknown): val is InterviewMode {
  return val === 'voice' || val === 'text';
}

function isDifficulty(val: unknown): val is DifficultyLevel {
  return val === 'beginner' || val === 'intermediate' || val === 'advanced';
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, aiConfigured: isGeminiConfigured() });
  });

  // -------------------------------------------------------------------------
  // Auth Routes
  // -------------------------------------------------------------------------
  app.post('/api/auth/register', (req, res) => {
    const { fullName, email, password, confirmPassword } = req.body ?? {};
    const result = registerUser({
      fullName: String(fullName ?? ''),
      email: String(email ?? ''),
      password: String(password ?? ''),
      confirmPassword: String(confirmPassword ?? ''),
    });

    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    setAuthCookie(res, result.token);
    res.status(201).json({ user: result.user, token: result.token });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body ?? {};
    const result = loginUser({
      email: String(email ?? ''),
      password: String(password ?? ''),
    });

    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    setAuthCookie(res, result.token);
    res.json({ user: result.user, token: result.token });
  });

  app.post('/api/auth/logout', (req, res) => {
    const token = extractAuthToken(req);
    deleteAuthSession(token);
    clearAuthCookie(res);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', (req, res) => {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.status(200).json({ authenticated: false, user: null, aiConfigured: isGeminiConfigured() });
      return;
    }
    res.json({ authenticated: true, user, aiConfigured: isGeminiConfigured() });
  });

  // -------------------------------------------------------------------------
  // Dashboard & History Routes
  // -------------------------------------------------------------------------
  app.get('/api/dashboard', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    res.json(buildUserDashboard(user));
  });

  app.get('/api/history', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    res.json({
      history: getHistoryForUser(user.id),
      aiConfigured: isGeminiConfigured(),
    });
  });

  // -------------------------------------------------------------------------
  // Interview Lifecycle Routes
  // -------------------------------------------------------------------------
  app.post('/api/interview/start', async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const {
      interviewType,
      interviewMode,
      difficulty,
      questionCount,
      targetRole,
    } = req.body ?? {};

    const safeType: InterviewType = isInterviewType(interviewType) ? interviewType : 'hr';
    const safeMode: InterviewMode = isInterviewMode(interviewMode) ? interviewMode : 'voice';
    const safeDiff: DifficultyLevel = isDifficulty(difficulty) ? difficulty : 'intermediate';
    const rawCount = Number(questionCount);
    const safeCount = rawCount === 10 || rawCount === 15 ? rawCount : 5;
    const safeRole =
      safeType === 'custom' && typeof targetRole === 'string' && targetRole.trim().length > 0
        ? targetRole.trim().slice(0, 80)
        : safeType === 'hr'
          ? 'Graduate / Entry-Level Candidate'
          : 'Software Developer';

    const questions = await generateInterviewQuestions({
      interviewType: safeType,
      difficulty: safeDiff,
      targetRole: safeRole,
      questionCount: safeCount,
    });

    const session = createInterviewAttempt({
      userId: user.id,
      interviewType: safeType,
      interviewMode: safeMode,
      difficulty: safeDiff,
      targetRole: safeRole,
      questions,
    });

    res.status(201).json({ session });
  });

  app.get('/api/interview/active', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;
    const attemptId = Number(req.query.attemptId);
    if (attemptId > 0) {
      const row = getAttemptForUser(attemptId, user.id);
      if (!row) {
        res.status(404).json({ error: 'Interview session not found.' });
        return;
      }
      res.json({
        session: {
          attemptId: row.id,
          interviewType: row.interview_type,
          interviewMode: row.interview_mode,
          difficulty: row.difficulty,
          targetRole: row.target_role,
          questionCount: row.question_count,
          currentIndex: row.current_index,
          status: row.status,
          questions: JSON.parse(row.questions_json),
          answers: JSON.parse(row.answers_json),
          startedAt: row.started_at,
          aiConfigured: isGeminiConfigured(),
        },
      });
      return;
    }

    const active = getActiveAttemptForUser(user.id);
    res.json({ session: active });
  });

  app.post('/api/interview/submit-answer', async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const { attemptId, answer, durationSeconds } = req.body ?? {};
    const id = Number(attemptId);
    if (!id) {
      res.status(400).json({ error: 'Valid attemptId is required.' });
      return;
    }

    const validation = validateNonEmptyAnswer(answer);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const row = getAttemptForUser(id, user.id);
    if (!row) {
      res.status(404).json({ error: 'Interview session not found.' });
      return;
    }
    if (row.status === 'completed' || row.status === 'ended_early') {
      res.status(400).json({ error: 'This interview has already ended.' });
      return;
    }

    const questions = JSON.parse(row.questions_json) as InterviewQuestionItem[];
    const currentQuestion = questions[row.current_index];
    if (!currentQuestion) {
      res.status(400).json({ error: 'Invalid question index.' });
      return;
    }

    try {
      const evaluation = await evaluateAnswerWithGemini({
        question: currentQuestion,
        answer: String(answer),
        interviewType: row.interview_type,
        difficulty: row.difficulty,
        targetRole: row.target_role,
      });

      const updatedSession = saveQuestionEvaluation({
        attemptId: id,
        userId: user.id,
        evaluation,
        durationSeconds: Number(durationSeconds) || 0,
      });

      res.json({ session: updatedSession, evaluation });
    } catch (err) {
      res.status(409).json({
        error: err instanceof Error ? err.message : 'Unable to save answer.',
      });
    }
  });

  app.post('/api/interview/next', async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const { attemptId, durationSeconds, allowAdaptiveFollowUp } = req.body ?? {};
    const id = Number(attemptId);
    if (!id) {
      res.status(400).json({ error: 'Valid attemptId is required.' });
      return;
    }

    try {
      const result = await advanceOrCompleteAttempt({
        attemptId: id,
        userId: user.id,
        durationSeconds: Number(durationSeconds) || 0,
        allowAdaptiveFollowUp: Boolean(allowAdaptiveFollowUp),
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Unable to advance interview.',
      });
    }
  });

  app.post('/api/interview/end', async (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const { attemptId, durationSeconds } = req.body ?? {};
    const id = Number(attemptId);
    if (!id) {
      res.status(400).json({ error: 'Valid attemptId is required.' });
      return;
    }

    try {
      const result = await endAttemptEarly({
        attemptId: id,
        userId: user.id,
        durationSeconds: Number(durationSeconds) || 0,
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Unable to end interview.',
      });
    }
  });

  app.get('/api/interview/report/:attemptId', (req, res) => {
    const user = requireAuth(req, res);
    if (!user) return;

    const attemptId = Number(req.params.attemptId);
    const report = getSavedReportForUser(attemptId, user.id);
    if (!report) {
      res.status(404).json({ error: 'Report not found for your account.' });
      return;
    }
    res.json({ report });
  });

  // Vite dev middleware or production static serving
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI Interview Preparation Bot running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
