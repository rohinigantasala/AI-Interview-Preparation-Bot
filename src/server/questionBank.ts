import type {
  DifficultyLevel,
  InterviewQuestionItem,
  InterviewType,
} from '../lib/types';

interface SeedQuestion {
  category: string;
  prompt: string;
  expectedFocus: string[];
  difficulty: DifficultyLevel[];
}

const HR_SEED_BANK: SeedQuestion[] = [
  {
    category: 'Introduction',
    prompt: 'Could you please introduce yourself and walk me through your background?',
    expectedFocus: ['education', 'project', 'skills', 'experience', 'goal'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
  },
  {
    category: 'Self-Awareness',
    prompt: 'What are your greatest strengths and one area you are actively improving?',
    expectedFocus: ['strength', 'example', 'improve', 'feedback', 'learning'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
  },
  {
    category: 'Role Motivation',
    prompt: 'Why are you interested in this role and why should our team choose you?',
    expectedFocus: ['skills', 'value', 'team', 'contribute', 'fit'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
  },
  {
    category: 'Teamwork & Conflict',
    prompt: 'Tell me about a time you navigated a disagreement or challenge inside a team project.',
    expectedFocus: ['situation', 'listen', 'action', 'resolve', 'outcome'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
  },
  {
    category: 'Adaptability',
    prompt: 'Describe a situation where you had to learn a new tool or skill under a tight deadline.',
    expectedFocus: ['deadline', 'learn', 'plan', 'deliver', 'result'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
  },
  {
    category: 'Career Vision',
    prompt: 'Where do you see yourself growing professionally over the next three to five years?',
    expectedFocus: ['growth', 'ownership', 'skills', 'mentor', 'impact'],
    difficulty: ['beginner', 'intermediate'],
  },
  {
    category: 'Ownership',
    prompt: 'Tell me about a mistake or setback in a project and how you handled accountability.',
    expectedFocus: ['mistake', 'root cause', 'fix', 'prevent', 'lesson'],
    difficulty: ['intermediate', 'advanced'],
  },
  {
    category: 'Prioritization',
    prompt: 'How do you prioritize competing tasks when multiple deliverables are due simultaneously?',
    expectedFocus: ['impact', 'urgency', 'communicate', 'schedule', 'tradeoff'],
    difficulty: ['intermediate', 'advanced'],
  },
  {
    category: 'Leadership',
    prompt: 'Give an example of when you took initiative without being asked to improve a process or product.',
    expectedFocus: ['initiative', 'problem', 'action', 'measurable', 'team'],
    difficulty: ['intermediate', 'advanced'],
  },
  {
    category: 'Pressure Management',
    prompt: 'How do you stay calm and maintain quality when production requirements change suddenly?',
    expectedFocus: ['clarify', 'scope', 'collaborate', 'test', 'deliver'],
    difficulty: ['advanced'],
  },
  {
    category: 'Communication',
    prompt: 'Explain a complex technical decision you had to present to a non-technical stakeholder.',
    expectedFocus: ['audience', 'simplify', 'tradeoff', 'outcome', 'clarity'],
    difficulty: ['advanced'],
  },
  {
    category: 'Culture Fit',
    prompt: 'What kind of engineering or workplace culture helps you do your best work?',
    expectedFocus: ['collaboration', 'feedback', 'autonomy', 'learning', 'standards'],
    difficulty: ['beginner', 'intermediate'],
  },
  {
    category: 'Feedback',
    prompt: 'Tell me about critical feedback you received and how you applied it afterward.',
    expectedFocus: ['feedback', 'listen', 'adjust', 'result', 'growth'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
  },
  {
    category: 'Achievement',
    prompt: 'What project or academic milestone are you most proud of, and what was your direct contribution?',
    expectedFocus: ['contribution', 'challenge', 'architecture', 'impact', 'metric'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
  },
  {
    category: 'Closing',
    prompt: 'What excites you most about contributing to our company in your first ninety days?',
    expectedFocus: ['onboard', 'learn', 'deliver', 'collaborate', 'impact'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
  },
];

const TECHNICAL_SEED_BANK: SeedQuestion[] = [
  {
    category: 'Python',
    prompt: 'What makes Python distinctive as a programming language, and where does it excel?',
    expectedFocus: ['interpreted', 'high-level', 'dynamic', 'readable', 'libraries'],
    difficulty: ['beginner', 'intermediate'],
  },
  {
    category: 'Python',
    prompt: 'Explain the practical differences between a Python list and a tuple, and when you choose each.',
    expectedFocus: ['mutable', 'immutable', 'memory', 'hashable', 'performance'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
  },
  {
    category: 'Object-Oriented Programming',
    prompt: 'Walk through the four pillars of OOP and illustrate encapsulation and polymorphism with examples.',
    expectedFocus: ['encapsulation', 'inheritance', 'polymorphism', 'abstraction', 'class'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
  },
  {
    category: 'Python',
    prompt: 'How do dictionaries work internally in Python, and why is key lookup fast on average?',
    expectedFocus: ['hash', 'key', 'value', 'O(1)', 'collision'],
    difficulty: ['intermediate', 'advanced'],
  },
  {
    category: 'SQL & DBMS',
    prompt: 'Compare DELETE, TRUNCATE, and DROP in SQL in terms of data removal, rollback, and schema.',
    expectedFocus: ['where', 'dml', 'ddl', 'rollback', 'schema'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
  },
  {
    category: 'SQL & DBMS',
    prompt: 'What is a primary key versus a foreign key, and how do they enforce referential integrity?',
    expectedFocus: ['unique', 'not null', 'reference', 'integrity', 'relationship'],
    difficulty: ['beginner', 'intermediate'],
  },
  {
    category: 'SQL & DBMS',
    prompt: 'Explain INNER JOIN, LEFT JOIN, and how GROUP BY interacts with HAVING.',
    expectedFocus: ['matching', 'null', 'aggregate', 'filter', 'rows'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
  },
  {
    category: 'Algorithms',
    prompt: 'Compare linear search and binary search, including prerequisites and Big-O time complexity.',
    expectedFocus: ['sorted', 'sequential', 'divide', 'O(n)', 'O(log n)'],
    difficulty: ['beginner', 'intermediate'],
  },
  {
    category: 'Algorithms',
    prompt: 'What is recursion, why is a base case mandatory, and what happens to the call stack?',
    expectedFocus: ['base case', 'stack', 'subproblem', 'overflow', 'terminate'],
    difficulty: ['beginner', 'intermediate'],
  },
  {
    category: 'Data Structures',
    prompt: 'Compare stacks, queues, and hash maps with concrete real-world software use cases.',
    expectedFocus: ['LIFO', 'FIFO', 'lookup', 'complexity', 'example'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
  },
  {
    category: 'Complexity',
    prompt: 'How do you analyze time and space complexity using Big-O notation when optimizing slow code?',
    expectedFocus: ['worst-case', 'growth', 'memory', 'tradeoff', 'bottleneck'],
    difficulty: ['intermediate', 'advanced'],
  },
  {
    category: 'Error Handling',
    prompt: 'How should exception handling be structured cleanly in production code without swallowing errors?',
    expectedFocus: ['try', 'except', 'specific', 'logging', 'cleanup'],
    difficulty: ['beginner', 'intermediate', 'advanced'],
  },
  {
    category: 'Backend & APIs',
    prompt: 'What makes a REST API well-designed in terms of HTTP methods, status codes, and validation?',
    expectedFocus: ['idempotent', 'status', 'validation', 'stateless', 'resource'],
    difficulty: ['intermediate', 'advanced'],
  },
  {
    category: 'Database Performance',
    prompt: 'How do database indexes speed up SELECT queries, and what write trade-offs do they introduce?',
    expectedFocus: ['b-tree', 'scan', 'write', 'storage', 'selectivity'],
    difficulty: ['intermediate', 'advanced'],
  },
  {
    category: 'System Design',
    prompt: 'How would you diagnose and fix a web endpoint that slows down dramatically under concurrent traffic?',
    expectedFocus: ['profiling', 'query', 'caching', 'connection', 'bottleneck'],
    difficulty: ['advanced'],
  },
];

export function selectCuratedQuestions(params: {
  interviewType: InterviewType;
  difficulty: DifficultyLevel;
  targetRole: string;
  questionCount: number;
}): InterviewQuestionItem[] {
  const pool =
    params.interviewType === 'hr' ? HR_SEED_BANK : TECHNICAL_SEED_BANK;

  const matchingDifficulty = pool.filter((q) =>
    q.difficulty.includes(params.difficulty),
  );
  const ordered = [
    ...matchingDifficulty,
    ...pool.filter((q) => !matchingDifficulty.includes(q)),
  ];

  const selected: InterviewQuestionItem[] = [];
  for (let i = 0; i < params.questionCount; i++) {
    const item = ordered[i % ordered.length];
    const prompt =
      params.interviewType === 'custom' && i === 0
        ? `As an applicant for ${params.targetRole}, how has your recent engineering or project experience prepared you for this role?`
        : item.prompt;

    selected.push({
      id: `q-${i + 1}`,
      index: i,
      category: params.interviewType === 'custom' && i === 0 ? params.targetRole : item.category,
      prompt,
      expectedFocus: item.expectedFocus,
      source: 'curated_bank',
    });
  }

  return selected;
}
