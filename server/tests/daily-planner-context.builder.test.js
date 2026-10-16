import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDailyPlannerContext,
} from '../src/services/daily-planner-context.builder.js';

test('builds a planner context from Daily Growth context', () => {
  const dailyGrowthContext = {
    date: '2026-10-13',
    timeZone: 'Asia/Calcutta',

    vision: {
      id: 3,
      userId: 7,
      statement: 'Become a full stack developer and build my own product.',
      values: 'Learning, consistency, creativity',
      identity: 'I am becoming an independent builder.',
      futureSelf: 'I want to become an independent AI product builder.',
      createdAt: '2026-10-13T08:51:50.207876Z',
      updatedAt: '2026-10-13T08:51:50.207876Z',
    },

    goals: {
      active: [
        {
          id: 4,
          userId: 7,
          title: 'Become a strong Full Stack AI Engineer',
          description: 'Build strong full-stack and AI engineering skills.',
          priority: 1,
          status: 'active',
          targetDate: '2027-06-30T00:00:00Z',
          createdAt: '2026-10-13T08:52:38.950808Z',
          updatedAt: '2026-10-13T08:52:38.950808Z',
        },
      ],
    },

    actions: {
      pending: [
        {
          id: 12,
          title: 'Complete one AI engineering coding task',
          description: 'Work on one concrete coding task.',
          goalId: 4,
          priority: 1,
          status: 'pending',
          dueDate: null,
          completedAt: null,
        },
      ],

      inProgress: [
        {
          id: 13,
          title: 'Study advanced Node.js patterns',
          description: 'Study advanced Node.js architecture.',
          goalId: 4,
          priority: 2,
          status: 'in_progress',
          dueDate: null,
          completedAt: null,
        },
      ],

      completedToday: [
        {
          id: 14,
          title: "Review yesterday's AI implementation",
          description: 'Review previous implementation.',
          goalId: 4,
          priority: 1,
          status: 'completed',
          dueDate: null,
          completedAt: '2026-10-13T09:03:31.479Z',
        },
      ],

      overdue: [],
    },

    suggestions: {
      pending: [
        {
          id: 34,
          title: 'Focus on one concrete AI engineering task per day',
          description: null,
          goalId: null,
          priority: 0,
          reasoning: 'Build consistency.',
          reflectionId: 2,
          source: 'ai',
        },
      ],
    },

    reflection: {
      id: 2,
      content: 'I made good progress today.',
      mood: 'good',
      productivity: 8,
      highlights: 'Made meaningful technical progress.',
      challenges: 'Consistency.',
      learnings: 'Concrete actions make progress easier to track.',
    },

    reflectionAnalysis: {
      id: 2,
      summary: 'Good progress with consistency as a challenge.',
      challenges:
        '["Maintaining consistency","Avoiding unfocused work"]',
      learnings:
        '["Concrete actions make progress easier to track"]',
      highlights:
        '["Made meaningful technical progress"]',
      goalAlignment:
        '[{"goal":"Become a strong Full Stack AI Engineer","alignment":"high"}]',
      progressAnalysis:
        '{"completedCount":3,"pendingCount":3,"inProgressCount":1}',
      recommendedActions:
        '[{"title":"Focus on one task","reason":"Build consistency"}]',
    },
  };

  const result = buildDailyPlannerContext(
    dailyGrowthContext
  );

  assert.equal(result.date, '2026-10-13');
  assert.equal(result.timeZone, 'Asia/Calcutta');

  assert.equal(
    result.vision.statement,
    'Become a full stack developer and build my own product.'
  );

  assert.equal(result.activeGoals.length, 1);
  assert.equal(result.activeGoals[0].id, 4);

  assert.equal(result.currentActions.pending.length, 1);
  assert.equal(result.currentActions.inProgress.length, 1);
  assert.equal(result.currentActions.completedToday.length, 1);

  assert.equal(result.pendingSuggestions.length, 1);
  assert.equal(result.pendingSuggestions[0].id, 34);

  assert.equal(result.reflection.mood, 'good');
  assert.equal(result.reflection.productivity, 8);

  assert.deepEqual(
    result.reflectionAnalysis.challenges,
    [
      'Maintaining consistency',
      'Avoiding unfocused work',
    ]
  );

  assert.deepEqual(
    result.reflectionAnalysis.progressAnalysis,
    {
      completedCount: 3,
      pendingCount: 3,
      inProgressCount: 1,
    }
  );

  assert.deepEqual(
    result.reflectionAnalysis.recommendedActions,
    [
      {
        title: 'Focus on one task',
        reason: 'Build consistency',
      },
    ]
  );
});

test('handles missing optional sections safely', () => {
  const result = buildDailyPlannerContext({
    date: '2026-10-13',
    timeZone: 'Asia/Calcutta',
    vision: null,
    goals: {
      active: [],
    },
    actions: {
      pending: [],
      inProgress: [],
      completedToday: [],
      overdue: [],
    },
    suggestions: {
      pending: [],
    },
    reflection: null,
    reflectionAnalysis: null,
  });

  assert.equal(result.vision, null);
  assert.deepEqual(result.activeGoals, []);

  assert.deepEqual(result.currentActions, {
    pending: [],
    inProgress: [],
    completedToday: [],
    overdue: [],
  });

  assert.deepEqual(result.pendingSuggestions, []);
  assert.equal(result.reflection, null);
  assert.equal(result.reflectionAnalysis, null);
});

test('handles malformed reflection analysis JSON safely', () => {
  const result = buildDailyPlannerContext({
    date: '2026-10-13',
    timeZone: 'Asia/Calcutta',

    vision: null,

    goals: {
      active: [],
    },

    actions: {
      pending: [],
      inProgress: [],
      completedToday: [],
      overdue: [],
    },

    suggestions: {
      pending: [],
    },

    reflection: null,

    reflectionAnalysis: {
      summary: 'Analysis',
      challenges: 'not valid json',
      learnings: null,
      highlights: '[]',
      goalAlignment: '{}',
      progressAnalysis: 'not valid json',
      recommendedActions: '[]',
    },
  });

  assert.deepEqual(
    result.reflectionAnalysis.challenges,
    []
  );

  assert.deepEqual(
    result.reflectionAnalysis.learnings,
    []
  );

  assert.deepEqual(
    result.reflectionAnalysis.highlights,
    []
  );

  assert.deepEqual(
    result.reflectionAnalysis.goalAlignment,
    {}
  );

  assert.equal(
    result.reflectionAnalysis.progressAnalysis,
    null
  );

  assert.deepEqual(
    result.reflectionAnalysis.recommendedActions,
    []
  );
});

test('rejects a missing Daily Growth context', () => {
  assert.throws(
    () => buildDailyPlannerContext(null),
    /Daily Growth context is required/
  );
});