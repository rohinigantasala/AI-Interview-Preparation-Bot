export type InterviewType = 'hr' | 'technical' | 'custom';
export type InterviewMode = 'voice' | 'text';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type PerformanceLevel =
  | 'Excellent'
  | 'Good'
  | 'Average'
  | 'Needs Improvement';

export type EvaluationMode = 'gemini_ai' | 'rule_based_fallback';

export interface AuthUser {
  id: number;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface InterviewQuestionItem {
  id: string;
  index: number;
  category: string;
  prompt: string;
  expectedFocus: string[];
  isFollowUp?: boolean;
  source: 'gemini_ai' | 'curated_bank';
}

export interface QuestionEvaluation {
  questionId: string;
  questionIndex: number;
  questionPrompt: string;
  category: string;
  submittedAnswer: string;
  wordCount: number;
  score: number; // out of 10
  maxScore: number; // 10
  strengths: string[];
  weaknesses: string[];
  missingPoints: string[];
  suggestedImprovements: string[];
  strongerAnswerExample: string;
  summaryFeedback: string;
  evaluationMode: EvaluationMode;
  evaluationLabel: string;
  fallbackNotice?: string;
  submittedAt: string;
}

export interface FinalInterviewReport {
  attemptId: number;
  interviewType: InterviewType;
  interviewMode: InterviewMode;
  difficulty: DifficultyLevel;
  targetRole: string;
  questionCount: number;
  answeredCount: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  performanceLevel: PerformanceLevel;
  durationSeconds: number;
  strongestAreas: string[];
  weakestAreas: string[];
  communicationFeedback: string;
  technicalFeedback: string;
  improvementPlan: string[];
  evaluationNotice: string;
  usesAiEvaluation: boolean;
  answers: QuestionEvaluation[];
  completedAt: string;
}

export interface InterviewAttemptSummary {
  id: number;
  interviewType: InterviewType;
  interviewMode: InterviewMode;
  difficulty: DifficultyLevel;
  targetRole: string;
  questionCount: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  performanceLevel: PerformanceLevel;
  durationSeconds: number;
  status: 'in_progress' | 'completed' | 'ended_early';
  startedAt: string;
  completedAt: string | null;
}

export interface ActiveInterviewSession {
  attemptId: number;
  interviewType: InterviewType;
  interviewMode: InterviewMode;
  difficulty: DifficultyLevel;
  targetRole: string;
  questionCount: number;
  currentIndex: number;
  status: 'in_progress' | 'awaiting_next' | 'completed' | 'ended_early';
  questions: InterviewQuestionItem[];
  answers: QuestionEvaluation[];
  startedAt: string;
  aiConfigured: boolean;
}

export interface DashboardSummary {
  user: AuthUser;
  stats: {
    interviewsCompleted: number;
    averageScore: number | null;
    averagePercentage: number | null;
    bestScore: number | null;
    bestPercentage: number | null;
    totalPracticeSeconds: number;
  };
  recentHistory: InterviewAttemptSummary[];
  progressPoints: {
    label: string;
    percentage: number;
    scoreLabel: string;
    type: InterviewType;
  }[];
  recommendedFocus: string[];
  activeAttempt: ActiveInterviewSession | null;
  aiConfigured: boolean;
}
