import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeterministicReportTotals,
  countWords,
  evaluateAnswerRuleBasedFallback,
  formatDuration,
  getPerformanceLevel,
  validateNonEmptyAnswer,
} from './scoring';
import type { InterviewQuestionItem } from './types';

test('countWords and validateNonEmptyAnswer handle edge cases', () => {
  assert.equal(countWords(''), 0);
  assert.equal(countWords('  hello   world \n test '), 3);
  assert.equal(validateNonEmptyAnswer('   ').valid, false);
  assert.equal(validateNonEmptyAnswer('Answer text').valid, true);
});

test('getPerformanceLevel maps bands accurately', () => {
  assert.equal(getPerformanceLevel(82), 'Excellent');
  assert.equal(getPerformanceLevel(65), 'Good');
  assert.equal(getPerformanceLevel(45), 'Average');
  assert.equal(getPerformanceLevel(20), 'Needs Improvement');
});

test('formatDuration formats seconds into readable strings', () => {
  assert.equal(formatDuration(65), '1m 05s');
  assert.equal(formatDuration(3665), '1h 1m');
});

test('rule-based fallback labels evaluationMode honestly and scores out of 10', () => {
  const q: InterviewQuestionItem = {
    id: 'q1',
    index: 0,
    category: 'Python',
    prompt: 'Difference between list and tuple.',
    expectedFocus: ['mutable', 'immutable', 'memory'],
    source: 'curated_bank',
  };

  const weak = evaluateAnswerRuleBasedFallback(q, 'Lists change.', 'technical', 'No key');
  assert.equal(weak.evaluationMode, 'rule_based_fallback');
  assert.equal(weak.maxScore, 10);
  assert.ok(weak.score <= 4);

  const strong = evaluateAnswerRuleBasedFallback(
    q,
    'In Python, a list is mutable so elements can be added or modified in place, whereas a tuple is immutable after creation which allows slightly lower memory overhead and makes tuples usable as dictionary keys when needed in real applications.',
    'technical',
    'No key',
  );
  assert.ok(strong.score >= 8);
  assert.equal(strong.evaluationMode, 'rule_based_fallback');
});

test('buildDeterministicReportTotals computes accurate percentage and areas', () => {
  const q: InterviewQuestionItem = {
    id: 'q1',
    index: 0,
    category: 'HR',
    prompt: 'Tell me about yourself.',
    expectedFocus: ['project', 'skills'],
    source: 'curated_bank',
  };
  const eval1 = evaluateAnswerRuleBasedFallback(q, 'Short answer.', 'hr', 'Fallback');
  const eval2 = evaluateAnswerRuleBasedFallback(
    q,
    'I am a computer science graduate with strong Python skills and full-stack project experience building reliable web applications for real users and student teams.',
    'hr',
    'Fallback',
  );

  const totals = buildDeterministicReportTotals({
    attemptId: 1,
    interviewType: 'hr',
    interviewMode: 'text',
    difficulty: 'intermediate',
    targetRole: 'Software Developer',
    questionCount: 2,
    durationSeconds: 120,
    answers: [eval1, eval2],
  });

  assert.equal(totals.maxScore, 20);
  assert.equal(totals.totalScore, eval1.score + eval2.score);
  assert.equal(totals.usesAiEvaluation, false);
});
