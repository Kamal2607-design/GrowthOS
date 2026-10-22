import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import Dashboard from '../pages/Dashboard.jsx';
import Planner from '../pages/Planner.jsx';
import Goals from '../pages/Goals.jsx';
import { mockApi } from './mockApi.js';
import { ME_ROUTE, progressFor, renderPage, todayContext, todayRoutes } from './fixtures.jsx';

// The test fixtures' "today" is 2026-10-21 in UTC.
const iso = (day, hour = 9) => `2026-10-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00:00Z`;

function dashboardRoutes(overrides = {}) {
  return {
    ...todayRoutes(),
    'GET /api/actions': {
      actions: [
        { id: 1, title: 'A', status: 'completed', createdAt: iso(19), completedAt: iso(19, 18) },
        { id: 2, title: 'B', status: 'completed', createdAt: iso(20), completedAt: iso(20, 18) },
        { id: 3, title: 'C', status: 'completed', createdAt: iso(20), completedAt: iso(21, 8) },
        { id: 4, title: 'D', status: 'pending', createdAt: iso(21) },
      ],
    },
    'GET /api/reflections': {
      reflections: [
        { id: 9, content: 'Good', mood: 'good', productivity: 7, reflectionDate: iso(20, 20) },
        { id: 8, content: 'Okay', mood: 'neutral', productivity: 5, reflectionDate: iso(19, 20) },
      ],
    },
    ...overrides,
  };
}

describe('Dashboard', () => {
  it('summarises the day, streaks, activity and goal progress', async () => {
    mockApi(dashboardRoutes());
    renderPage(<Dashboard />);

    expect(await screen.findByText('Become an independent AI product builder.')).toBeInTheDocument();
    expect(screen.getByText('3-day streak')).toBeInTheDocument();
    expect(screen.getByText('Open actions')).toBeInTheDocument();
    expect(screen.getByText('AI suggestions waiting')).toBeInTheDocument();
    expect(screen.getByText(/3 actions completed/)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Completed actions per day' })).toBeInTheDocument();
    expect(await screen.findByText(/2 of 6 actions done · 33%/)).toBeInTheDocument();
    expect(screen.getByText('Test goal')).toBeInTheDocument();
    expect(screen.getByRole('table', { name: 'Productivity rating per reflection' })).toBeInTheDocument();
  });

  it('accepts an AI suggestion from the insights card', async () => {
    const api = mockApi(
      dashboardRoutes({
        'POST /api/action-suggestions/50/accept': { suggestion: { id: 50 }, action: { id: 90 } },
      }),
    );
    renderPage(<Dashboard />);

    await userEvent.click(await screen.findByRole('button', { name: 'Accept: Build one small AI feature' }));

    await waitFor(() => expect(api.called('POST /api/action-suggestions/50/accept')).toHaveLength(1));
    expect(await screen.findByText(/Added “Build one small AI feature”/)).toBeInTheDocument();
  });

  it('shows onboarding to a new user', async () => {
    mockApi(
      dashboardRoutes({
        'GET /api/daily-growth/today': {
          context: todayContext({
            vision: null,
            goals: { active: [] },
            actions: { today: [], pending: [], inProgress: [], completedToday: [], overdue: [] },
            suggestions: { pending: [] },
          }),
        },
        'GET /api/actions': { actions: [] },
        'GET /api/reflections': { reflections: [] },
      }),
    );
    renderPage(<Dashboard />);

    expect(await screen.findByRole('heading', { name: "Let's turn your vision into today's actions" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open AI Planner/ })).toHaveAttribute('href', '/planner');
  });
});

function plannerRoutes(overrides = {}) {
  return {
    ...ME_ROUTE,
    'GET /api/daily-growth/today': { context: todayContext() },
    'GET /api/action-suggestions?status=pending': {
      suggestions: [
        { id: 50, title: 'Build one small AI feature', goalId: 4, priority: 1, source: 'ai', status: 'pending', createdAt: iso(21) },
        { id: 20, title: 'Complete one set of leg raises', goalId: null, priority: 2, source: 'ai', status: 'pending', createdAt: iso(15) },
        { id: 21, title: 'Review one coding mistake', goalId: null, priority: 3, source: 'ai', status: 'pending', createdAt: iso(14) },
      ],
    },
    ...overrides,
  };
}

describe('AI Planner', () => {
  it('turns a request into suggestions with the action planner', async () => {
    const api = mockApi(
      plannerRoutes({
        'POST /api/action-planner': {
          query: 'Plan my week',
          suggestions: [{ id: 60, title: 'Block two focus sessions' }],
          skippedCount: 1,
        },
      }),
    );
    renderPage(<Planner />);

    await userEvent.type(await screen.findByLabelText('Your request'), 'Plan my week');
    await userEvent.click(screen.getByRole('button', { name: /Make a plan/ }));

    await waitFor(() => expect(api.called('POST /api/action-planner')).toHaveLength(1));
    expect(api.called('POST /api/action-planner')[0].body).toEqual({ query: 'Plan my week' });
    expect(await screen.findByText(/1 new suggestion added to your inbox below\. 1 idea skipped/)).toBeInTheDocument();
  });

  it('answers a question and adds a recommended step only when asked', async () => {
    const api = mockApi(
      plannerRoutes({
        'POST /api/rag': {
          query: 'What should I focus on?',
          answer: {
            answer: 'Focus on the engineering goal this week.',
            keyInsights: ['Two coding actions are open'],
            recommendedActions: [{ title: 'Finish the coding task', reason: 'It is due today' }],
          },
          contextSummary: { memories: 1, goals: 3, actions: 6, reflections: 2, hasVision: true },
        },
        'POST /api/actions': { status: 201, body: { action: { id: 81 } } },
      }),
    );
    renderPage(<Planner />, '/planner?ask=What%20should%20I%20focus%20on%3F');

    expect(await screen.findByLabelText('Your request')).toHaveValue('What should I focus on?');
    await userEvent.click(screen.getByRole('button', { name: /Ask GrowthOS/ }));

    expect(await screen.findByText('Focus on the engineering goal this week.')).toBeInTheDocument();
    expect(screen.getByText('Two coding actions are open')).toBeInTheDocument();
    expect(screen.getByText(/Based on 3 goals, 6 actions, 2 reflections and 1 memory/)).toBeInTheDocument();
    expect(api.called('POST /api/actions')).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: /Add as action/ }));

    await waitFor(() => expect(api.called('POST /api/actions')).toHaveLength(1));
    expect(api.called('POST /api/actions')[0].body).toEqual({
      title: 'Finish the coding task',
      description: 'It is due today',
    });
  });

  it('plans the day and reports an automatic re-plan', async () => {
    mockApi(
      plannerRoutes({
        'POST /api/daily-growth/generate': {
          status: 201,
          body: {
            createdCount: 2,
            suggestions: [],
            attempts: 2,
            intelligence: { relevantMemoryCount: 3, goalProgressCount: 2 },
          },
        },
      }),
    );
    renderPage(<Planner />);

    await userEvent.click(await screen.findByRole('button', { name: /Plan my day/ }));

    expect(
      await screen.findByText(/2 new suggestions for today\. Used 3 memories and progress for 2 goals\. The first draft was rejected/),
    ).toBeInTheDocument();
  });

  it('dismisses all older suggestions at once', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const api = mockApi(
      plannerRoutes({
        'POST /api/action-suggestions/20/reject': { suggestion: { id: 20 } },
        'POST /api/action-suggestions/21/reject': { suggestion: { id: 21 } },
      }),
    );
    renderPage(<Planner />);

    await userEvent.click(await screen.findByRole('button', { name: 'Dismiss 2 older suggestions' }));

    await waitFor(() => expect(api.called('POST /api/action-suggestions/20/reject')).toHaveLength(1));
    expect(api.called('POST /api/action-suggestions/21/reject')).toHaveLength(1);
    expect(api.called('POST /api/action-suggestions/50/reject')).toHaveLength(0);
  });
});

describe('Goals', () => {
  it('asks Qwen for actions toward the selected goal', async () => {
    const api = mockApi({
      ...ME_ROUTE,
      'GET /api/vision': { vision: { statement: 'Become an independent AI product builder.' } },
      'GET /api/goals?status=active': {
        goals: [{ id: 4, title: 'Become a strong Full Stack AI Engineer', status: 'active', targetDate: null }],
      },
      'GET /api/goal-progress/4/progress': progressFor(2, 6),
      'GET /api/actions?goalId=4': { actions: [] },
      'POST /api/action-suggestions/goals/4/generate': {
        status: 201,
        body: {
          suggestions: [{ id: 70, title: 'Refactor one endpoint', goalId: 4, priority: 2, source: 'ai', reasoning: 'Depth' }],
          skippedCount: 1,
        },
      },
    });
    renderPage(<Goals />);

    await userEvent.click(await screen.findByRole('button', { name: /Suggest actions with AI/ }));

    await waitFor(() => expect(api.called('POST /api/action-suggestions/goals/4/generate')).toHaveLength(1));
    const card = await screen.findByRole('article', { name: 'Refactor one endpoint' });
    expect(within(card).getByRole('button', { name: 'Accept: Refactor one endpoint' })).toBeInTheDocument();
    expect(screen.getByText(/1 idea\(s\) skipped/)).toBeInTheDocument();
  });
});
