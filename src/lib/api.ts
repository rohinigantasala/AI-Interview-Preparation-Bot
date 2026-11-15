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
} from './types';

const TOKEN_KEY = 'prepbot_auth_token';

export function getStoredToken(): string {
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setStoredToken(token: string): void {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage restriction
  }
}

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers['X-Auth-Token'] = token;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function registerAccount(payload: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<{ user: AuthUser; token: string }> {
  const res = await apiFetch<{ user: AuthUser; token: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setStoredToken(res.token);
  return res;
}

export async function loginAccount(payload: {
  email: string;
  password: string;
}): Promise<{ user: AuthUser; token: string }> {
  const res = await apiFetch<{ user: AuthUser; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setStoredToken(res.token);
  return res;
}

export async function logoutAccount(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  setStoredToken('');
}

export async function fetchCurrentUser(): Promise<{ user: AuthUser | null }> {
  try {
    return await apiFetch<{ user: AuthUser | null }>('/api/auth/me');
  } catch {
    return { user: null };
  }
}

export function fetchDashboard(): Promise<DashboardSummary> {
  return apiFetch('/api/dashboard');
}

export function fetchHistory(): Promise<{ history: InterviewAttemptSummary[]; aiConfigured: boolean }> {
  return apiFetch('/api/history');
}

export function startConfiguredInterview(payload: {
  interviewType: InterviewType;
  interviewMode: InterviewMode;
  difficulty: DifficultyLevel;
  questionCount: 5 | 10 | 15;
  targetRole?: string;
}): Promise<{ session: ActiveInterviewSession }> {
  return apiFetch('/api/interview/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchActiveInterview(attemptId?: number): Promise<{ session: ActiveInterviewSession | null }> {
  const query = attemptId ? `?attemptId=${attemptId}` : '';
  return apiFetch(`/api/interview/active${query}`);
}

export function submitInterviewAnswer(payload: {
  attemptId: number;
  answer: string;
  durationSeconds: number;
}): Promise<{ session: ActiveInterviewSession; evaluation: QuestionEvaluation }> {
  return apiFetch('/api/interview/submit-answer', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function advanceInterview(payload: {
  attemptId: number;
  durationSeconds: number;
  allowAdaptiveFollowUp?: boolean;
}): Promise<{
  completed: boolean;
  session: ActiveInterviewSession;
  report?: FinalInterviewReport;
}> {
  return apiFetch('/api/interview/next', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function endInterviewSession(payload: {
  attemptId: number;
  durationSeconds: number;
}): Promise<{ finalized: boolean; report?: FinalInterviewReport }> {
  return apiFetch('/api/interview/end', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchSavedReport(attemptId: number): Promise<{ report: FinalInterviewReport }> {
  return apiFetch(`/api/interview/report/${attemptId}`);
}
