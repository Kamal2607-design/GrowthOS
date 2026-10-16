import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDailyPlannerPrompt,
} from '../src/services/ai/daily-planner-prompt.service.js';


test(
  'builds a daily planner prompt from planner context',
  () => {
    const context = {
      date: '2026-10-13',
      timeZone: 'Asia/Calcutta',

      vision: {
        statement:
          'Become a strong AI engineer',
        values:
          'Learning, consistency',
        identity:
          'Full Stack Developer',
        futureSelf:
          'AI Engineering professional',
      },

      activeGoals: [
        {
          id: 4,
          title:
            'Become a strong Full Stack AI Engineer',
          description:
            'Build strong AI engineering skills',
          priority: 1,
          targetDate:
            '2027-06-30',
        },
      ],

      currentActions: {
        pending: [
          {
            id: 12,
            title:
              'Complete one AI engineering coding task',
            description:
              'Finish one focused coding task',
            goalId: 4,
            priority: 1,
            dueDate: null,
          },
        ],

        inProgress: [
          {
            id: 13,
            title:
              'Study advanced Node.js patterns',
            description:
              'Study advanced Node.js',
            goalId: 4,
            priority: 2,
            dueDate: null,
          },
        ],

        completedToday: [
          {
            id: 14,
            title:
              "Review yesterday's AI implementation",
            goalId: 4,
          },
        ],

        overdue: [],
      },

      pendingSuggestions: [
        {
          id: 21,
          title:
            'Practice coding challenges',
          description:
            'Practice one coding problem',
          goalId: 4,
          priority: 2,
          reasoning:
            'Supports coding consistency',
        },
      ],

      reflection: {
        id: 2,
        content:
          'I made good progress on GrowthOS today.',
        mood: 'good',
        productivity: 8,
        highlights:
          'Completed important implementation work',
        challenges:
          'Need more consistency',
        learnings:
          'Focused work helps me progress',
      },

      reflectionAnalysis: {
        summary:
          'Good progress with a consistency challenge.',
        challenges: [
          'Maintaining consistency',
        ],
        learnings: [
          'Focused implementation is effective',
        ],
        highlights: [
          'GrowthOS implementation progressed',
        ],
        goalAlignment: [
          'Strong alignment with AI engineering goal',
        ],
        progressAnalysis:
          'Progress is improving',
        recommendedActions: [
          'Focus on one concrete AI engineering task',
        ],
      },
    };

    const prompt =
      buildDailyPlannerPrompt(
        context
      );

    assert.equal(
      typeof prompt,
      'string'
    );

    assert.match(
      prompt,
      /Daily Action Planning intelligence/
    );

    assert.match(
      prompt,
      /2026-10-13/
    );

    assert.match(
      prompt,
      /Asia\/Calcutta/
    );

    assert.match(
      prompt,
      /Goal ID: 4/
    );

    assert.match(
      prompt,
      /Complete one AI engineering coding task/
    );

    assert.match(
      prompt,
      /Practice coding challenges/
    );

    assert.match(
      prompt,
      /Do not simply repeat an existing pending suggestion/
    );

    assert.match(
      prompt,
      /Return between 1 and 3 suggestions/
    );

    assert.match(
      prompt,
      /"goalId": 123/
    );
  }
);

test(
  'builds a safe prompt when optional context is missing',
  () => {
    const prompt =
      buildDailyPlannerPrompt({
        date: '2026-10-13',
        timeZone: 'Asia/Calcutta',
      });

    assert.match(
      prompt,
      /No vision has been defined yet/
    );

    assert.match(
      prompt,
      /No active goals found/
    );

    assert.match(
      prompt,
      /No current actions found/
    );

    assert.match(
      prompt,
      /No pending suggestions found/
    );

    assert.match(
      prompt,
      /No reflection has been recorded today/
    );

    assert.match(
      prompt,
      /No reflection analysis is available/
    );
  }
);

test(
  'rejects missing planner context',
  () => {
    assert.throws(
      () =>
        buildDailyPlannerPrompt(
          null
        ),
      {
        message:
          'DAILY_PLANNER_CONTEXT_REQUIRED',
      }
    );
  }
);