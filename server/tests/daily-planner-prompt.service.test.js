import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDailyPlannerPrompt,
} from '../src/services/ai/daily-planner-prompt.service.js';

function createContext(overrides = {}) {
  return {
    date: '2026-10-13',
    timeZone: 'Asia/Calcutta',

    vision: {
      statement: 'Become a strong AI engineer',
      values: 'Learning, consistency',
      identity: 'Full Stack Developer',
      futureSelf: 'AI Engineering professional',
    },

    activeGoals: [
      {
        id: 4,
        title: 'Become a strong Full Stack AI Engineer',
        description: 'Build strong full-stack and AI engineering skills.',
        priority: 1,
        targetDate: '2027-06-30',
      },
    ],

    currentActions: {
      pending: [
        {
          id: 10,
          title: 'Complete one AI engineering coding task',
          description: 'Build one focused feature.',
          goalId: 4,
          priority: 1,
          dueDate: '2026-10-13',
        },
      ],
      inProgress: [
        {
          id: 11,
          title: 'Practice coding challenges',
          description: 'Solve one JavaScript problem.',
          goalId: 4,
          priority: 2,
          dueDate: null,
        },
      ],
      completedToday: [],
      overdue: [],
    },

    pendingSuggestions: [
      {
        id: 36,
        title: 'Review one coding mistake from yesterday',
        description: 'Review a previous coding mistake.',
        goalId: null,
        priority: 2,
        reasoning: 'Support deliberate learning.',
      },
    ],

    reflection: {
      id: 2,
      content: 'I made progress but need more consistency.',
      mood: 'focused',
      productivity: 8,
      highlights: 'Completed important implementation work',
      challenges: 'Need more consistency',
      learnings: 'Focused work helps me progress',
    },

    reflectionAnalysis: {
      summary: 'Good progress with a consistency challenge.',
      challenges: ['Maintaining consistency'],
      learnings: ['Focused implementation is effective'],
      highlights: ['GrowthOS implementation progressed'],
      goalAlignment: ['Strong alignment with AI engineering goal'],
      progressAnalysis: 'Progress is improving',
      recommendedActions: ['Focus on one concrete AI engineering task'],
    },

    relevantMemories: [
      {
        memoryId: 21,
        content: 'The user prefers focused implementation tasks.',
        similarity: 0.82,
      },
    ],

    goalProgress: [
      {
        goalId: 4,
        status: 'available',
        progress: {
          totalActions: 4,
          completedActions: 2,
          pendingActions: 1,
          inProgressActions: 1,
          completionPercentage: 50,
        },
        activity: {
          trend: 'improving',
          recentCompleted: 2,
          previousCompleted: 0,
          currentActivityStreak: 1,
        },
        reflectionCorrelation: {
          count: 1,
          reflections: [],
        },
      },
    ],

    dataQuality: {
      memoryStatus: 'available',
      goalProgressStatus: 'available',
    },

    ...overrides,
  };
}

test('builds a daily planner prompt with existing context', () => {
  const prompt = buildDailyPlannerPrompt(createContext());

  assert.equal(typeof prompt, 'string');

  assert.match(prompt, /Daily Action Planning intelligence/);
  assert.match(prompt, /2026-10-13/);
  assert.match(prompt, /Asia\/Calcutta/);

  assert.match(prompt, /Become a strong AI engineer/);
  assert.match(prompt, /Goal ID: 4/);

  assert.match(prompt, /Complete one AI engineering coding task/);
  assert.match(prompt, /Practice coding challenges/);
  assert.match(prompt, /Review one coding mistake from yesterday/);

  assert.match(prompt, /Today's Reflection|TODAY'S REFLECTION/);
  assert.match(prompt, /REFLECTION ANALYSIS/);

  assert.match(
    prompt,
    /Do not simply repeat an existing pending suggestion/,
  );

  assert.match(prompt, /Return between 1 and 3 suggestions/);
  assert.match(prompt, /"goalId": 123/);
});

test('includes relevant memories in the prompt', () => {
  const prompt = buildDailyPlannerPrompt(createContext());

  assert.match(prompt, /RELEVANT PERSONAL MEMORIES/);
  assert.match(
    prompt,
    /The user prefers focused implementation tasks/,
  );
  assert.match(prompt, /Memory ID: 21/);
});

test('includes objective goal progress and activity', () => {
  const prompt = buildDailyPlannerPrompt(createContext());

  assert.match(prompt, /OBJECTIVE GOAL PROGRESS/);
  assert.match(prompt, /"completionPercentage":50/);
  assert.match(prompt, /"trend":"improving"/);
  assert.match(prompt, /"recentCompleted":2/);
});

test('includes data availability status', () => {
  const prompt = buildDailyPlannerPrompt(createContext());

  assert.match(prompt, /DATA AVAILABILITY/);
  assert.match(prompt, /Memory retrieval status: available/);
  assert.match(prompt, /Goal progress status: available/);
});

test('does not describe unavailable memory retrieval as no memories', () => {
  const prompt = buildDailyPlannerPrompt(
    createContext({
      relevantMemories: [],
      dataQuality: {
        memoryStatus: 'unavailable',
        goalProgressStatus: 'available',
      },
    }),
  );

  assert.match(
    prompt,
    /Memory retrieval is unavailable\. Relevant memories are unknown\./,
  );

  assert.match(
    prompt,
    /If memory retrieval is unavailable, do not assume that no/,
  );
});

test('marks unavailable goal progress without inventing metrics', () => {
  const prompt = buildDailyPlannerPrompt(
    createContext({
      goalProgress: [
        {
          goalId: 4,
          status: 'unavailable',
          progress: null,
          activity: null,
          reflectionCorrelation: null,
        },
      ],
      dataQuality: {
        memoryStatus: 'available',
        goalProgressStatus: 'unavailable',
      },
    }),
  );

  assert.match(prompt, /Goal ID: 4/);
  assert.match(prompt, /Progress status: Unavailable/);
  assert.match(prompt, /Do not infer this goal's progress/);
  assert.match(prompt, /Goal progress status: unavailable/);
});

test('handles missing optional context safely', () => {
  const prompt = buildDailyPlannerPrompt({
    date: '2026-10-13',
    timeZone: 'Asia/Calcutta',
  });

  assert.match(prompt, /No vision has been defined yet/);
  assert.match(prompt, /No active goals found/);
  assert.match(prompt, /No current actions found/);
  assert.match(prompt, /No pending suggestions found/);
  assert.match(prompt, /No reflection has been recorded today/);
  assert.match(prompt, /No reflection analysis is available/);
  assert.match(prompt, /No relevant memories were retrieved/);
  assert.match(
    prompt,
    /No goal progress data is available for this planning request/,
  );
});

test('rejects missing planner context', () => {
  assert.throws(
    () => buildDailyPlannerPrompt(null),
    {
      message: 'DAILY_PLANNER_CONTEXT_REQUIRED',
    },
  );
});

test('marks only explicitly labelled placeholder goals', () => {
  const prompt = buildDailyPlannerPrompt(
    createContext({
      activeGoals: [
        {
          id: 5,
          title: 'Get six-pack abs by year-end',
          description: null,
          priority: 1,
          targetDate: null,
        },
        {
          id: 6,
          title: 'INSUFFICIENT DATA GOAL',
          description: null,
          priority: 0,
          targetDate: null,
        },
      ],
    }),
  );

  const placeholderNotes = prompt.match(
    /Planning status: Test\/placeholder goal/g,
  ) ?? [];

  // One annotation on Goal 6 plus the rule that references it.
  assert.equal(placeholderNotes.length, 2);
  assert.match(
    prompt,
    /Title: INSUFFICIENT DATA GOAL\nDescription: None\nPriority: 0\nTarget Date: None\nPlanning status: Test\/placeholder goal/,
  );
  assert.doesNotMatch(
    prompt,
    /Title: Get six-pack abs by year-end\nDescription: None\nPriority: 1\nTarget Date: None\nPlanning status/,
  );
});

test('forbids same-day reflection claims when no reflection exists', () => {
  const prompt = buildDailyPlannerPrompt(
    createContext({
      reflection: null,
      reflectionAnalysis: null,
    }),
  );

  assert.match(prompt, /No reflection has been recorded today/);
  assert.match(
    prompt,
    /Do not claim, quote, or imply that the user reflected, reported,/,
  );
  assert.match(prompt, /Never cite "today's reflection"/);
});

test('labels relevant memories as historical context', () => {
  const prompt = buildDailyPlannerPrompt(createContext());

  assert.match(
    prompt,
    /These memories are historical context\. They are not today's\nreflection and not evidence of anything done today\./,
  );
  assert.match(
    prompt,
    /must not be presented\n   as today's reflection or as proof of a same-day activity/,
  );
});
