import { useCallback, useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { AuthPages } from './components/AuthPages';
import { DashboardPage } from './components/DashboardPage';
import { ConfigureInterviewPage } from './components/ConfigureInterviewPage';
import { VoiceInterviewPage } from './components/VoiceInterviewPage';
import { TextInterviewPage } from './components/TextInterviewPage';
import { FeedbackPage } from './components/FeedbackPage';
import { ResultPage } from './components/ResultPage';
import { HistoryPage } from './components/HistoryPage';
import {
  advanceInterview,
  endInterviewSession,
  fetchActiveInterview,
  fetchCurrentUser,
  fetchDashboard,
  fetchHistory,
  fetchSavedReport,
  logoutAccount,
  startConfiguredInterview,
  submitInterviewAnswer,
} from './lib/api';
import type {
  ActiveInterviewSession,
  AuthUser,
  DashboardSummary,
  DifficultyLevel,
  FinalInterviewReport,
  InterviewAttemptSummary,
  InterviewMode,
  InterviewType,
  QuestionEvaluation,
} from './lib/types';

function normalizePath(p: string): string {
  if (!p || p === '/') return '/';
  return p.replace(/\/+$/, '');
}

const PROTECTED_PATHS = [
  '/dashboard',
  '/configure',
  '/interview/voice',
  '/interview/text',
  '/feedback',
  '/result',
  '/history',
];

export default function App() {
  const [path, setPath] = useState<string>(() => normalizePath(window.location.pathname));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const [configPresetType, setConfigPresetType] = useState<InterviewType>('hr');
  const [startingInterview, setStartingInterview] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const [activeSession, setActiveSession] = useState<ActiveInterviewSession | null>(null);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [interviewError, setInterviewError] = useState<string | null>(null);
  const [latestEvaluation, setLatestEvaluation] = useState<QuestionEvaluation | null>(null);

  const [report, setReport] = useState<FinalInterviewReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const [history, setHistory] = useState<InterviewAttemptSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const navigate = useCallback((nextPath: string) => {
    const clean = normalizePath(nextPath);
    if (clean !== normalizePath(window.location.pathname)) {
      window.history.pushState({}, '', clean);
    }
    setPath(clean);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  // Bootstrap authentication state
  useEffect(() => {
    let active = true;
    fetchCurrentUser()
      .then((res) => {
        if (!active) return;
        setUser(res.user);
        setAuthChecked(true);
      })
      .catch(() => {
        if (!active) return;
        setAuthChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Listen to browser back/forward
  useEffect(() => {
    const onPop = () => setPath(normalizePath(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const data = await fetchDashboard();
      setDashboardData(data);
    } catch (err) {
      setDashboardError(err instanceof Error ? err.message : 'Unable to load dashboard.');
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetchHistory();
      setHistory(res.history);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Unable to load history.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Auth route protection + route data hydration
  useEffect(() => {
    if (!authChecked) return;

    const needsAuth = PROTECTED_PATHS.some((p) => path === p || path.startsWith('/result/'));
    if (needsAuth && !user) {
      navigate('/login');
      return;
    }

    if (user && (path === '/login' || path === '/register')) {
      navigate('/dashboard');
      return;
    }

    if (!user) return;

    if (path === '/dashboard') {
      void loadDashboard();
    } else if (path === '/history') {
      void loadHistory();
    } else if (
      (path === '/interview/voice' || path === '/interview/text') &&
      !activeSession
    ) {
      void fetchActiveInterview().then((res) => {
        if (res.session) {
          setActiveSession(res.session);
        } else {
          navigate('/configure');
        }
      });
    } else if (path.startsWith('/result/')) {
      const id = Number(path.split('/')[2]);
      if (id > 0) {
        setReportLoading(true);
        setReportError(null);
        void fetchSavedReport(id)
          .then((res) => setReport(res.report))
          .catch((err) =>
            setReportError(err instanceof Error ? err.message : 'Report unavailable.'),
          )
          .finally(() => setReportLoading(false));
      }
    }
  }, [authChecked, user, path, activeSession, navigate, loadDashboard, loadHistory]);

  const handleAuthSuccess = (authedUser: AuthUser) => {
    setUser(authedUser);
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await logoutAccount();
    setUser(null);
    setDashboardData(null);
    setActiveSession(null);
    setReport(null);
    setHistory([]);
    navigate('/');
  };

  const handleStartConfigured = async (config: {
    interviewType: InterviewType;
    interviewMode: InterviewMode;
    difficulty: DifficultyLevel;
    questionCount: 5 | 10 | 15;
    targetRole: string;
  }) => {
    setStartingInterview(true);
    setConfigError(null);
    setInterviewError(null);
    setLatestEvaluation(null);
    try {
      const res = await startConfiguredInterview(config);
      setActiveSession(res.session);
      navigate(
        res.session.interviewMode === 'voice'
          ? '/interview/voice'
          : '/interview/text',
      );
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : 'Failed to start interview.');
    } finally {
      setStartingInterview(false);
    }
  };

  const handleResumeActive = async (attemptId: number, mode: InterviewMode) => {
    const res = await fetchActiveInterview(attemptId);
    if (res.session) {
      setActiveSession(res.session);
      navigate(mode === 'voice' ? '/interview/voice' : '/interview/text');
    }
  };

  const handleSubmitVoiceAnswer = async (
    answer: string,
    durationSeconds: number,
  ): Promise<QuestionEvaluation | null> => {
    if (!activeSession) return null;
    setSubmittingAnswer(true);
    setInterviewError(null);
    try {
      const res = await submitInterviewAnswer({
        attemptId: activeSession.attemptId,
        answer,
        durationSeconds,
      });
      setActiveSession(res.session);
      setLatestEvaluation(res.evaluation);
      return res.evaluation;
    } catch (err) {
      setInterviewError(err instanceof Error ? err.message : 'Submission failed.');
      return null;
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleSubmitTextAnswer = async (answer: string, durationSeconds: number) => {
    const evalResult = await handleSubmitVoiceAnswer(answer, durationSeconds);
    if (evalResult) {
      navigate('/feedback');
    }
  };

  const handleAdvanceQuestion = async (durationSeconds: number, adaptive = false) => {
    if (!activeSession) return;
    setSubmittingAnswer(true);
    setInterviewError(null);
    try {
      const res = await advanceInterview({
        attemptId: activeSession.attemptId,
        durationSeconds,
        allowAdaptiveFollowUp: adaptive,
      });
      setActiveSession(res.session);
      setLatestEvaluation(null);

      if (res.completed && res.report) {
        setReport(res.report);
        setActiveSession(null);
        navigate(`/result/${res.report.attemptId}`);
      } else {
        navigate(
          res.session.interviewMode === 'voice'
            ? '/interview/voice'
            : '/interview/text',
        );
      }
    } catch (err) {
      setInterviewError(err instanceof Error ? err.message : 'Unable to advance question.');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleEndInterview = async (durationSeconds: number) => {
    if (!activeSession) {
      navigate('/dashboard');
      return;
    }
    try {
      const res = await endInterviewSession({
        attemptId: activeSession.attemptId,
        durationSeconds,
      });
      setActiveSession(null);
      setLatestEvaluation(null);
      if (res.finalized && res.report) {
        setReport(res.report);
        navigate(`/result/${res.report.attemptId}`);
      } else {
        navigate('/dashboard');
      }
    } catch {
      setActiveSession(null);
      navigate('/dashboard');
    }
  };

  const handleViewSavedReport = async (attemptId: number) => {
    setReportLoading(true);
    setReportError(null);
    navigate(`/result/${attemptId}`);
    try {
      const res = await fetchSavedReport(attemptId);
      setReport(res.report);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Unable to load report.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleRetake = async (prevReport: FinalInterviewReport) => {
    await handleStartConfigured({
      interviewType: prevReport.interviewType,
      interviewMode: prevReport.interviewMode,
      difficulty: prevReport.difficulty,
      questionCount: (prevReport.questionCount === 10 || prevReport.questionCount === 15
        ? prevReport.questionCount
        : 5) as 5 | 10 | 15,
      targetRole: prevReport.targetRole,
    });
  };

  const handlePractiseWeakAreas = async (prevReport: FinalInterviewReport) => {
    const focusTopic =
      prevReport.weakestAreas[0]?.split(':')[0] || prevReport.targetRole;
    await handleStartConfigured({
      interviewType: 'custom',
      interviewMode: prevReport.interviewMode,
      difficulty: prevReport.difficulty,
      questionCount: 5,
      targetRole: `${prevReport.targetRole} (${focusTopic} Focus)`.slice(0, 80),
    });
  };

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar
        currentPath={path}
        user={user}
        onNavigate={navigate}
        onLogout={handleLogout}
      />

      <main>
        {path === '/' && <LandingPage user={user} onNavigate={navigate} />}

        {(path === '/login' || path === '/register') && (
          <AuthPages
            mode={path === '/register' ? 'register' : 'login'}
            onAuthSuccess={handleAuthSuccess}
            onNavigate={navigate}
          />
        )}

        {path === '/dashboard' && user && (
          <DashboardPage
            data={dashboardData}
            loading={dashboardLoading}
            error={dashboardError}
            onStartPreset={(type) => {
              setConfigPresetType(type);
              navigate('/configure');
            }}
            onResumeActive={handleResumeActive}
            onViewReport={handleViewSavedReport}
            onNavigate={navigate}
            onRetry={loadDashboard}
          />
        )}

        {path === '/configure' && user && (
          <ConfigureInterviewPage
            initialType={configPresetType}
            starting={startingInterview}
            error={configError}
            onStart={handleStartConfigured}
            onBack={() => navigate('/dashboard')}
          />
        )}

        {path === '/interview/voice' && user && (
          <VoiceInterviewPage
            user={user}
            session={activeSession}
            submitting={submittingAnswer}
            serverError={interviewError}
            onSubmitAnswer={handleSubmitVoiceAnswer}
            onNextQuestion={(sec) => handleAdvanceQuestion(sec, true)}
            onEndInterview={handleEndInterview}
          />
        )}

        {path === '/interview/text' && user && (
          <TextInterviewPage
            session={activeSession}
            submitting={submittingAnswer}
            serverError={interviewError}
            onSubmitAnswer={handleSubmitTextAnswer}
            onEndInterview={handleEndInterview}
          />
        )}

        {path === '/feedback' && user && (
          <FeedbackPage
            evaluation={latestEvaluation}
            questionNumber={(activeSession?.currentIndex ?? 0) + 1}
            totalQuestions={activeSession?.questionCount ?? 5}
            loadingNext={submittingAnswer}
            onNextQuestion={() => handleAdvanceQuestion(0, false)}
            onBackToDashboard={() => navigate('/dashboard')}
          />
        )}

        {(path === '/result' || path.startsWith('/result/')) && user && (
          <ResultPage
            report={report}
            loading={reportLoading}
            error={reportError}
            onRetake={handleRetake}
            onPractiseWeakAreas={handlePractiseWeakAreas}
            onBackToDashboard={() => navigate('/dashboard')}
          />
        )}

        {path === '/history' && user && (
          <HistoryPage
            history={history}
            loading={historyLoading}
            error={historyError}
            onViewReport={handleViewSavedReport}
            onStartNew={() => navigate('/configure')}
            onBackToDashboard={() => navigate('/dashboard')}
          />
        )}
      </main>
    </div>
  );
}
