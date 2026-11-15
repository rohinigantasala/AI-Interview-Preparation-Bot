import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  buildDeterministicReportTotals,
  countWords,
  evaluateAnswerRuleBasedFallback,
  MAX_QUESTION_SCORE,
} from '../lib/scoring';
import type {
  DifficultyLevel,
  FinalInterviewReport,
  InterviewMode,
  InterviewQuestionItem,
  InterviewType,
  QuestionEvaluation,
} from '../lib/types';
import { selectCuratedQuestions } from './questionBank';

const GEMINI_MODEL = 'gemini-4-hydrogen';

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = (process.env.GEMINI_API_KEY ?? '').trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function isGeminiConfigured(): boolean {
  return getGeminiClient() !== null;
}

export async function generateInterviewQuestions(params: {
  interviewType: InterviewType;
  difficulty: DifficultyLevel;
  targetRole: string;
  questionCount: number;
}): Promise<InterviewQuestionItem[]> {
  const ai = getGeminiClient();
  if (!ai) {
    return selectCuratedQuestions(params);
  }

  const roleContext =
    params.interviewType === 'custom'
      ? `Target Role: ${params.targetRole}. Mix role-specific technical and practical behavioral questions tailored to ${params.targetRole}.`
      : params.interviewType === 'hr'
        ? 'Focus on realistic HR & behavioral interview questions (communication, teamwork, ownership, adaptability, motivation).'
        : 'Focus on realistic Software Engineering Technical interview questions (Python, SQL/DBMS, data structures, algorithms, APIs, problem solving).';

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Generate exactly ${params.questionCount} distinct ${params.difficulty}-level mock interview questions. ${roleContext} Keep each question crisp, realistic, and conversational like a real interviewer speaking to a candidate.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction:
          'You are an experienced technical and behavioral interviewer designing realistic spoken and written mock interviews.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                description: 'Short topic label such as Python, SQL, System Design, Teamwork, or Role Fit.',
              },
              prompt: {
                type: Type.STRING,
                description: 'A clear, natural interview question.',
              },
              expectedFocus: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3 to 5 concise concepts or keywords an ideal answer touches on.',
              },
            },
            required: ['category', 'prompt', 'expectedFocus'],
          },
        },
      },
    }),
      25000,
      'Question generation',
    );

    const parsed = JSON.parse((response.text ?? '[]').trim()) as Array<{
      category: string;
      prompt: string;
      expectedFocus: string[];
    }>;

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return selectCuratedQuestions(params);
    }

    return parsed.slice(0, params.questionCount).map((item, idx) => ({
      id: `q-${idx + 1}`,
      index: idx,
      category: item.category || (params.interviewType === 'hr' ? 'HR' : 'Technical'),
      prompt: item.prompt,
      expectedFocus: Array.isArray(item.expectedFocus) ? item.expectedFocus.slice(0, 5) : [],
      source: 'gemini_ai',
    }));
  } catch (err) {
    console.warn('Gemini question generation fallback activated:', err instanceof Error ? err.message : err);
    return selectCuratedQuestions(params);
  }
}

export async function evaluateAnswerWithGemini(params: {
  question: InterviewQuestionItem;
  answer: string;
  interviewType: InterviewType;
  difficulty: DifficultyLevel;
  targetRole: string;
}): Promise<QuestionEvaluation> {
  const ai = getGeminiClient();
  const trimmedAnswer = params.answer.trim();
  const wordCount = countWords(trimmedAnswer);

  if (!ai) {
    return evaluateAnswerRuleBasedFallback(
      params.question,
      trimmedAnswer,
      params.interviewType,
      'Gemini API key is not configured on the server. Showing separately labeled rule-based fallback scoring.',
    );
  }

  const rubric =
    params.interviewType === 'hr'
      ? 'Evaluate strictly on: communication, confidence of expression, clarity, relevance to the question, professionalism, and answer structure (e.g. STAR).'
      : `Evaluate strictly on: relevance to the question, technical accuracy, conceptual understanding, completeness, clarity of explanation, problem-solving approach, and concrete examples (target role: ${params.targetRole}, difficulty: ${params.difficulty}).`;

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Interview Question (${params.question.category}): "${params.question.prompt}"\n\nCandidate Answer:\n"${trimmedAnswer}"\n\nScore the candidate fairly from 0 to 10 (integer or half-point) and provide structured coaching feedback.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: `You are an expert interviewer evaluating a candidate's mock interview answer. ${rubric} Never inflate scores for empty, off-topic, or nonsensical answers—score very weak/nonsensical answers 0-3.`,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.NUMBER,
              description: 'Score from 0 to 10.',
            },
            summaryFeedback: {
              type: Type.STRING,
              description: '2-3 sentence constructive summary evaluation.',
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '1 to 3 concrete strengths observed in the answer.',
            },
            weaknesses: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '1 to 3 specific weaknesses or gaps.',
            },
            missingPoints: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key points or concepts the candidate missed.',
            },
            suggestedImprovements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 to 3 actionable steps to improve.',
            },
            strongerAnswerExample: {
              type: Type.STRING,
              description: 'A concise example of a stronger 3-4 sentence answer.',
            },
          },
          required: [
            'score',
            'summaryFeedback',
            'strengths',
            'weaknesses',
            'missingPoints',
            'suggestedImprovements',
            'strongerAnswerExample',
          ],
        },
      },
    }),
      25000,
      'Answer evaluation',
    );

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      score: number;
      summaryFeedback: string;
      strengths: string[];
      weaknesses: string[];
      missingPoints: string[];
      suggestedImprovements: string[];
      strongerAnswerExample: string;
    };

    const clampedScore = Math.min(
      10,
      Math.max(0, Math.round((Number(parsed.score) || 0) * 10) / 10),
    );

    return {
      questionId: params.question.id,
      questionIndex: params.question.index,
      questionPrompt: params.question.prompt,
      category: params.question.category,
      submittedAnswer: trimmedAnswer,
      wordCount,
      score: clampedScore,
      maxScore: MAX_QUESTION_SCORE,
      strengths: parsed.strengths?.length ? parsed.strengths : ['Addressed the question directly.'],
      weaknesses: parsed.weaknesses?.length ? parsed.weaknesses : ['No major weaknesses noted.'],
      missingPoints: parsed.missingPoints ?? [],
      suggestedImprovements: parsed.suggestedImprovements?.length
        ? parsed.suggestedImprovements
        : ['Continue refining concise, concrete examples.'],
      strongerAnswerExample: parsed.strongerAnswerExample || '',
      summaryFeedback: parsed.summaryFeedback || 'Evaluated by Gemini AI.',
      evaluationMode: 'gemini_ai',
      evaluationLabel: 'Gemini AI Evaluation',
      submittedAt: new Date().toISOString(),
    };
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Gemini API call failed';
    console.warn('Gemini evaluation fallback activated:', reason);
    return evaluateAnswerRuleBasedFallback(
      params.question,
      trimmedAnswer,
      params.interviewType,
      `Gemini AI evaluation was temporarily unavailable (${reason}). Showing separately labeled rule-based fallback scoring.`,
    );
  }
}

export async function maybeGenerateFollowUpQuestion(params: {
  previousQuestion: InterviewQuestionItem;
  previousAnswer: string;
  nextPlannedQuestion: InterviewQuestionItem;
  interviewType: InterviewType;
  targetRole: string;
}): Promise<InterviewQuestionItem> {
  const ai = getGeminiClient();
  if (!ai) {
    return params.nextPlannedQuestion;
  }

  try {
    const response = await withTimeout(
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Candidate just answered "${params.previousQuestion.prompt}" with: "${params.previousAnswer.slice(0, 600)}".\n\nPlanned next question: "${params.nextPlannedQuestion.prompt}" (${params.nextPlannedQuestion.category}).\n\nDecide whether to ask a sharp, relevant 1-sentence follow-up probing their previous answer OR smoothly transition to the planned topic for a ${params.targetRole} (${params.interviewType}) interview.`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction: 'Return JSON with a natural conversational question and short category.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isFollowUp: { type: Type.BOOLEAN },
            category: { type: Type.STRING },
            prompt: { type: Type.STRING },
          },
          required: ['isFollowUp', 'category', 'prompt'],
        },
      },
    }),
      7000,
      'Follow-up generation',
    );

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      isFollowUp?: boolean;
      category?: string;
      prompt?: string;
    };

    if (parsed.isFollowUp && parsed.prompt && parsed.prompt.length > 12) {
      return {
        ...params.nextPlannedQuestion,
        category: parsed.category || params.nextPlannedQuestion.category,
        prompt: parsed.prompt,
        isFollowUp: true,
        source: 'gemini_ai',
      };
    }
    return params.nextPlannedQuestion;
  } catch {
    return params.nextPlannedQuestion;
  }
}

export async function generateFinalReportWithGemini(params: {
  attemptId: number;
  interviewType: InterviewType;
  interviewMode: InterviewMode;
  difficulty: DifficultyLevel;
  targetRole: string;
  questionCount: number;
  durationSeconds: number;
  answers: QuestionEvaluation[];
}): Promise<FinalInterviewReport> {
  const totals = buildDeterministicReportTotals(params);
  const completedAt = new Date().toISOString();

  const baseCommunication =
    params.answers.filter((a) => a.wordCount >= 20).length >= Math.ceil(params.answers.length / 2)
      ? 'Responses generally demonstrated steady elaboration and structure. Continue tightening opening statements so key points land early.'
      : 'Several answers were brief; expand with clear framing (context, action, measurable result) to sound confident in live conversations.';

  const baseTechnical =
    params.interviewType === 'hr'
      ? 'Not applicable for pure HR track; focus remained on behavioral storytelling, alignment, and clarity.'
      : 'Pair core definitions with real project trade-offs, edge cases, and concrete complexity or architecture details.';

  const ai = getGeminiClient();
  if (!ai || !totals.usesAiEvaluation) {
    return {
      attemptId: params.attemptId,
      interviewType: params.interviewType,
      interviewMode: params.interviewMode,
      difficulty: params.difficulty,
      targetRole: params.targetRole,
      questionCount: params.questionCount,
      answeredCount: totals.answeredCount,
      totalScore: totals.totalScore,
      maxScore: totals.maxScore,
      percentage: totals.percentage,
      performanceLevel: totals.performanceLevel,
      durationSeconds: params.durationSeconds,
      strongestAreas: totals.strongestAreas,
      weakestAreas: totals.weakestAreas,
      communicationFeedback: baseCommunication,
      technicalFeedback: baseTechnical,
      improvementPlan: totals.improvementPlan,
      evaluationNotice: totals.usesAiEvaluation
        ? 'Evaluated using Gemini AI across your interview answers.'
        : 'Evaluated using the separately identified rule-based fallback scorer (Gemini API unavailable).',
      usesAiEvaluation: totals.usesAiEvaluation,
      answers: params.answers,
      completedAt,
    };
  }

  try {
    const compactSummary = params.answers
      .map(
        (a, i) =>
          `Q${i + 1} (${a.category}, ${a.score}/10): ${a.questionPrompt} -> Feedback: ${a.summaryFeedback}`,
      )
      .join('\n');

    const response = await withTimeout(
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Summarize this ${params.difficulty} ${params.interviewType} (${params.targetRole}) mock interview (${totals.totalScore}/${totals.maxScore}, ${totals.percentage}%):\n${compactSummary}`,
      config: {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        systemInstruction:
          'Provide concise, encouraging, high-signal coaching feedback grounded strictly in the scores and answers provided.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strongestAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
            weakestAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
            communicationFeedback: { type: Type.STRING },
            technicalFeedback: { type: Type.STRING },
            improvementPlan: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            'strongestAreas',
            'weakestAreas',
            'communicationFeedback',
            'technicalFeedback',
            'improvementPlan',
          ],
        },
      },
    }),
      9000,
      'Final report synthesis',
    );

    const parsed = JSON.parse((response.text ?? '{}').trim()) as {
      strongestAreas?: string[];
      weakestAreas?: string[];
      communicationFeedback?: string;
      technicalFeedback?: string;
      improvementPlan?: string[];
    };

    return {
      attemptId: params.attemptId,
      interviewType: params.interviewType,
      interviewMode: params.interviewMode,
      difficulty: params.difficulty,
      targetRole: params.targetRole,
      questionCount: params.questionCount,
      answeredCount: totals.answeredCount,
      totalScore: totals.totalScore,
      maxScore: totals.maxScore,
      percentage: totals.percentage,
      performanceLevel: totals.performanceLevel,
      durationSeconds: params.durationSeconds,
      strongestAreas: parsed.strongestAreas?.length ? parsed.strongestAreas : totals.strongestAreas,
      weakestAreas: parsed.weakestAreas?.length ? parsed.weakestAreas : totals.weakestAreas,
      communicationFeedback: parsed.communicationFeedback || baseCommunication,
      technicalFeedback: parsed.technicalFeedback || baseTechnical,
      improvementPlan: parsed.improvementPlan?.length
        ? parsed.improvementPlan
        : totals.improvementPlan,
      evaluationNotice: 'Evaluated using Gemini AI across your interview answers.',
      usesAiEvaluation: true,
      answers: params.answers,
      completedAt,
    };
  } catch {
    return {
      attemptId: params.attemptId,
      interviewType: params.interviewType,
      interviewMode: params.interviewMode,
      difficulty: params.difficulty,
      targetRole: params.targetRole,
      questionCount: params.questionCount,
      answeredCount: totals.answeredCount,
      totalScore: totals.totalScore,
      maxScore: totals.maxScore,
      percentage: totals.percentage,
      performanceLevel: totals.performanceLevel,
      durationSeconds: params.durationSeconds,
      strongestAreas: totals.strongestAreas,
      weakestAreas: totals.weakestAreas,
      communicationFeedback: baseCommunication,
      technicalFeedback: baseTechnical,
      improvementPlan: totals.improvementPlan,
      evaluationNotice: totals.usesAiEvaluation
        ? 'Evaluated using Gemini AI with deterministic report aggregation.'
        : 'Evaluated using the separately identified rule-based fallback scorer.',
      usesAiEvaluation: totals.usesAiEvaluation,
      answers: params.answers,
      completedAt,
    };
  }
}
