import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { AuthProvider } from '../auth/AuthContext.jsx';
import { ToastProvider } from '../components/Toast.jsx';

/** Renders a page with the app's providers (auth, toasts, router). */
export function renderPage(element, path = '/') {
  return render(
    <ToastProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>{element}</MemoryRouter>
      </AuthProvider>
    </ToastProvider>,
  );
}

export function todayContext(overrides = {}) {
  return {
    date: '2026-10-21',
    timeZone: 'UTC',
    vision: { statement: 'Become an independent AI product builder.' },
    goals: {
      active: [
        { id: 4, title: 'Become a strong Full Stack AI Engineer', status: 'active' },
        { id: 6, title: 'INSUFFICIENT DATA GOAL', status: 'active' },
      ],
    },
    actions: {
      today: [],
      pending: [
        { id: 3, title: 'Solve one LeetCode problem', status: 'pending', goalId: 4, priority: 2, dueDate: null },
        { id: 17, title: 'TEST - Complete one measurable step', status: 'pending', goalId: 6, priority: 0, dueDate: null },
      ],
      inProgress: [
        { id: 1, title: 'Practice coding challenges', status: 'in_progress', goalId: 4, priority: 2, dueDate: null },
      ],
      completedToday: [],
      overdue: [],
    },
    suggestions: {
      pending: [
        {
          id: 50,
          title: 'Build one small AI feature',
          description: 'Implement the accept flow.',
          reasoning: 'Moves the engineering goal forward.',
          goalId: 4,
          priority: 1,
          createdAt: '2026-10-21T08:00:00Z',
        },
        {
          id: 20,
          title: 'Complete one set of leg raises',
          description: 'One set.',
          reasoning: 'Fitness.',
          goalId: null,
          priority: 2,
          createdAt: '2026-10-15T08:00:00Z',
        },
      ],
    },
    reflection: null,
    reflectionAnalysis: null,
    ...overrides,
  };
}

export const progressFor = (completedActions, activeActions) => ({
  progress: {
    goal: {},
    progress: {
      completedActions,
      activeActions,
      pendingActions: activeActions - completedActions,
      inProgressActions: 0,
      completionPercentage: activeActions ? (completedActions / activeActions) * 100 : 0,
    },
    activity: { trend: 'improving', recentCompleted: 1 },
    reflectionCorrelation: { count: 0, reflections: [] },
  },
});

export const ME_ROUTE = {
  'GET /api/auth/me': { user: { id: 1, email: 'me@example.com', name: 'Kamal Test' } },
};

export function todayRoutes(overrides = {}) {
  return {
    ...ME_ROUTE,
    'GET /api/daily-growth/today': { context: todayContext() },
    'GET /api/goal-progress/4/progress': progressFor(2, 6),
    'GET /api/goal-progress/6/progress': progressFor(0, 1),
    ...overrides,
  };
}

