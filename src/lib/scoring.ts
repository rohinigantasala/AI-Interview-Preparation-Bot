import type {
  DifficultyLevel,
  InterviewMode,
  InterviewQuestionItem,
  InterviewType,
  PerformanceLevel,
  QuestionEvaluation,
} from './types';

export const MAX_QUESTION_SCORE = 10;

export function countWords(text: string): number {
  const cleaned = (text || '').trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).filter(Boolean).length;
}

export function validateNonEmptyAnswer(text: unknown): { valid: boolean; error?: string } {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return {
      valid: false,
      error: 'Please provide an answer before submitting. Empty answers cannot be evaluated.',
    };
  }
  return { valid: true };
}

export function getPerformanceLevel(percentage: number): PerformanceLevel {
  if (percentage >= 80) return 'Excellent';
  if (percentage >= 60) return 'Good';
  if (percentage >= 40) return 'Average';
  return 'Needs Improvement';
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  }
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
}

/**
 * Separately identified Rule-Based Fallback Evaluator (Out of 10 Marks).
 * Used ONLY when the Gemini API is unavailable or unconfigured.
 * Never labeled as AI evaluation.
 */
export function evaluateAnswerRuleBasedFallback(
  question: InterviewQuestionItem,
  rawAnswer: string,
  interviewType: InterviewType,
  fallbackReason: string,
): QuestionEvaluation {
  const answer = rawAnswer.trim();
  const wordCount = countWords(answer);
  const lowered = answer.toLowerCase();

  const matched = question.expectedFocus.filter((kw) =>
    lowered.includes(kw.toLowerCase()),
  );
  const missing = question.expectedFocus.filter(
    (kw) => !lowered.includes(kw.toLowerCase()),
  );

  let lengthPoints = 2;
  if (wordCount >= 45) lengthPoints = 6;
  else if (wordCount >= 22) lengthPoints = 5;
  else if (wordCount >= 10) lengthPoints = 3;

  const keywordRatio =
    question.expectedFocus.length > 0
      ? matched.length / question.expectedFocus.length
      : 0.5;
  const keywordPoints = Math.round(keywordRatio * 4);
  const score = Math.min(10, Math.max(1, lengthPoints + keywordPoints));

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestedImprovements: string[] = [];

  if (wordCount >= 22) {
    strengths.push(`Substantive explanation length (${wordCount} words).`);
  } else {
    weaknesses.push(`Response is relatively brief (${wordCount} words) for a full interview answer.`);
  }

  if (matched.length > 0) {
    strengths.push(`Addressed relevant concepts: ${matched.slice(0, 4).join(', ')}.`);
  } else {
    weaknesses.push('Did not explicitly reference expected domain terminology for this question.');
  }

  if (missing.length > 0) {
    suggestedImprovements.push(
      `Incorporate specific discussion of: ${missing.slice(0, 3).join(', ')}.`,
    );
  }

  if (interviewType === 'hr') {
    suggestedImprovements.push(
      'Structure your story using Situation, Task, Action, and measurable Result (STAR).',
    );
  } else {
    suggestedImprovements.push(
      'Include a concrete real-world example, edge case, or trade-off to strengthen technical depth.',
    );
  }

  const strongerAnswerExample =
    interviewType === 'hr'
      ? 'Start with a clear 1-sentence thesis, share one specific project or team situation you owned, quantify the outcome, and connect what you learned directly to this role.'
      : `Begin with a crisp definition covering ${question.expectedFocus.slice(0, 2).join(' and ') || 'the core concept'}, explain how it works in practice, and finish with a real trade-off or example.`;

  return {
    questionId: question.id,
    questionIndex: question.index,
    questionPrompt: question.prompt,
    category: question.category,
    submittedAnswer: answer,
    wordCount,
    score,
    maxScore: MAX_QUESTION_SCORE,
    strengths: strengths.length > 0 ? strengths : ['Attempted the prompt directly.'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['Could deepen concrete examples.'],
    missingPoints: missing.slice(0, 4),
    suggestedImprovements,
    strongerAnswerExample,
    summaryFeedback: `Fallback rule-based score (${score}/10) calculated from response depth (${wordCount} words) and ${matched.length}/${question.expectedFocus.length} key concepts.`,
    evaluationMode: 'rule_based_fallback',
    evaluationLabel: 'Rule-Based Fallback Evaluation (Gemini API Unavailable)',
    fallbackNotice: fallbackReason,
    submittedAt: new Date().toISOString(),
  };
}

export function buildDeterministicReportTotals(params: {
  attemptId: number;
  interviewType: InterviewType;
  interviewMode: InterviewMode;
  difficulty: DifficultyLevel;
  targetRole: string;
  questionCount: number;
  durationSeconds: number;
  answers: QuestionEvaluation[];
}) {
  const answeredCount = params.answers.length;
  const totalScore = params.answers.reduce((sum, a) => sum + a.score, 0);
  const maxScore = Math.max(answeredCount * MAX_QUESTION_SCORE, MAX_QUESTION_SCORE);
  const percentage = Math.round((totalScore / maxScore) * 1000) / 10;
  const performanceLevel = getPerformanceLevel(percentage);
  const usesAiEvaluation = params.answers.some((a) => a.evaluationMode === 'gemini_ai');

  const sortedByScore = [...params.answers].sort((a, b) => b.score - a.score);
  const strongestAreas = sortedByScore
    .filter((a) => a.score >= 7)
    .slice(0, 3)
    .map((a) => `${a.category}: "${a.questionPrompt}" (${a.score}/10)`);

  const weakestAreas = [...params.answers]
    .sort((a, b) => a.score - b.score)
    .filter((a) => a.score < 8)
    .slice(0, 3)
    .map((a) => `${a.category}: "${a.questionPrompt}" (${a.score}/10)`);

  const allSuggestions = Array.from(
    new Set(params.answers.flatMap((a) => a.suggestedImprovements)),
  ).slice(0, 5);

  return {
    answeredCount,
    totalScore,
    maxScore,
    percentage,
    performanceLevel,
    usesAiEvaluation,
    strongestAreas:
      strongestAreas.length > 0
        ? strongestAreas
        : ['Completed the structured interview flow consistently.'],
    weakestAreas:
      weakestAreas.length > 0
        ? weakestAreas
        : ['No major weak spots detected in this session.'],
    improvementPlan:
      allSuggestions.length > 0
        ? allSuggestions
        : ['Continue practising timed responses with concrete project metrics.'],
  };
}
