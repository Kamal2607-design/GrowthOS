import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { AppRoutes } from '../App.jsx';
import { AuthProvider } from '../auth/AuthContext.jsx';
import { ToastProvider } from '../components/Toast.jsx';
import Today from '../pages/Today.jsx';
import Reflect from '../pages/Reflect.jsx';
import { mockApi } from './mockApi.js';
import { progressFor, renderPage, todayContext, todayRoutes } from './fixtures.jsx';


function renderToday() {
  return renderPage(<Today />);
}

describe('Today', () => {
  it('shows today’s suggestions, older ones separately, and grouped actions', async () => {
    mockApi(todayRoutes());
    renderToday();

    expect(await screen.findByRole('heading', { name: 'Build one small AI feature' })).toBeInTheDocument();
    expect(screen.getByText('1 older suggestion still waiting')).toBeInTheDocument();
    expect(screen.getByText('Practice coding challenges')).toBeInTheDocument();

    const testRow = screen.getByText('TEST - Complete one measurable step').closest('li');
    expect(within(testRow).getByText('Test data')).toBeInTheDocument();

    expect(await screen.findByText(/2 of 6 actions done/)).toBeInTheDocument();
    expect(screen.getByText('Test goal · not used for suggestions')).toBeInTheDocument();
  });

  it('accepts a suggestion and reloads the day', async () => {
    const api = mockApi(
      todayRoutes({
        'POST /api/action-suggestions/50/accept': { suggestion: { id: 50 }, action: { id: 99 } },
      }),
    );
    renderToday();

    await userEvent.click(await screen.findByRole('button', { name: 'Accept: Build one small AI feature' }));

    await waitFor(() => expect(api.called('POST /api/action-suggestions/50/accept')).toHaveLength(1));
    await waitFor(() => expect(api.called('GET /api/daily-growth/today').length).toBeGreaterThanOrEqual(2));
    expect(await screen.findByText(/Added "Build one small AI feature" to your actions/)).toBeInTheDocument();
  });

  it('marks an action done', async () => {
    const api = mockApi(
      todayRoutes({
        'PATCH /api/actions/3/status': { action: { id: 3, status: 'completed' } },
      }),
    );
    renderToday();

    await userEvent.click(await screen.findByRole('button', { name: 'Mark done: Solve one LeetCode problem' }));

    await waitFor(() => expect(api.called('PATCH /api/actions/3/status')).toHaveLength(1));
    expect(api.called('PATCH /api/actions/3/status')[0].body).toEqual({ status: 'completed' });
  });

  it('adds an action of your own', async () => {
    const api = mockApi(
      todayRoutes({
        'POST /api/actions': { status: 201, body: { action: { id: 77 } } },
      }),
    );
    renderToday();

    // Desktop toolbar button and the phone's floating button; CSS hides one.
    await userEvent.click((await screen.findAllByRole('button', { name: 'Add action' }))[0]);
    await userEvent.type(await screen.findByLabelText('What will you do? (required)'), 'Run 3 km before work');
    await userEvent.selectOptions(screen.getByLabelText('Goal'), '4');
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Add action' }));

    await waitFor(() => expect(api.called('POST /api/actions')).toHaveLength(1));
    expect(api.called('POST /api/actions')[0].body).toEqual({
      title: 'Run 3 km before work',
      description: null,
      goalId: 4,
      priority: 0,
      dueDate: null,
    });
  });

  it('explains a plan rejected for using a test goal', async () => {
    mockApi(
      todayRoutes({
        'POST /api/daily-growth/generate': {
          status: 422,
          body: { success: false, error: 'DAILY_PLANNER_GOAL_IS_PLACEHOLDER' },
        },
      }),
    );
    renderToday();

    await userEvent.click(await screen.findByRole('button', { name: /Suggest actions/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/assigned a suggestion to a test goal/);
  });

  it('explains when the AI planner is offline', async () => {
    mockApi(
      todayRoutes({
        'POST /api/daily-growth/generate': {
          status: 503,
          body: { success: false, error: 'The AI planner is temporarily unavailable', code: 'DAILY_PLANNER_AI_UNAVAILABLE' },
        },
      }),
    );
    renderToday();

    await userEvent.click(await screen.findByRole('button', { name: /Suggest actions/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Start Ollama/);
  });

  it('guides a new user to write a vision', async () => {
    mockApi({
      'GET /api/daily-growth/today': {
        context: todayContext({
          vision: null,
          goals: { active: [] },
          actions: { today: [], pending: [], inProgress: [], completedToday: [], overdue: [] },
          suggestions: { pending: [] },
        }),
      },
    });
    renderToday();

    expect(await screen.findByRole('heading', { name: 'Start with where you want to go' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Write your vision' })).toHaveAttribute('href', '/goals');
  });

  it('shows a retryable error when the day cannot load', async () => {
    mockApi({
      'GET /api/daily-growth/today': {
        status: 503,
        body: { success: false, error: 'Daily context is temporarily unavailable', code: 'DAILY_CONTEXT_GOALS_FETCH_FAILED' },
      },
    });
    renderToday();

    expect(await screen.findByRole('alert')).toHaveTextContent(/Something went wrong on the server/);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('Reflect', () => {
  it('saves a reflection with the API mood values', async () => {
    const api = mockApi({
      'GET /api/daily-growth/today': { context: todayContext() },
      'GET /api/reflections': { reflections: [] },
      'POST /api/reflections': { status: 201, body: { reflection: { id: 7 } } },
    });

    renderPage(<Reflect />);

    await userEvent.type(
      await screen.findByLabelText('In your own words (required)'),
      'Shipped the validation work.',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Very good' }));
    await userEvent.click(screen.getByRole('button', { name: 'Productivity 8' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save reflection' }));

    await waitFor(() => expect(api.called('POST /api/reflections')).toHaveLength(1));
    expect(api.called('POST /api/reflections')[0].body).toEqual({
      content: 'Shipped the validation work.',
      mood: 'very_good',
      productivity: 8,
      highlights: null,
      challenges: null,
      learnings: null,
    });
  });
});

describe('routing and sign-in', () => {
  function renderApp(path = '/') {
    return render(
      <ToastProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={[path]}>
            <AppRoutes />
          </MemoryRouter>
        </AuthProvider>
      </ToastProvider>,
    );
  }

  it('sends signed-out visitors to sign in', async () => {
    mockApi({ 'GET /api/auth/me': { status: 401, body: { message: 'Authentication required' } } });
    renderApp('/goals');

    expect(await screen.findByRole('heading', { name: "Turn your vision into today's actions" })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue with Google' })).toHaveAttribute('href', '/api/auth/google');
  });

  it('signs in and opens Today', async () => {
    const api = mockApi({
      ...todayRoutes(),
      'GET /api/auth/me': { status: 401, body: { message: 'Authentication required' } },
      'POST /api/auth/login': { user: { id: 1, email: 'me@example.com', name: 'Me' } },
    });
    renderApp('/');

    await userEvent.type(await screen.findByLabelText('Email'), 'me@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'correct-horse');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(api.called('POST /api/auth/login')[0].body).toEqual({
      email: 'me@example.com',
      password: 'correct-horse',
    });
    expect(await screen.findByRole('heading', { name: 'Build one small AI feature' })).toBeInTheDocument();
  });

  it('shows a clear message for wrong credentials', async () => {
    mockApi({
      'GET /api/auth/me': { status: 401, body: { message: 'Authentication required' } },
      'POST /api/auth/login': { status: 401, body: { message: 'Invalid email or password' } },
    });
    renderApp('/');

    await userEvent.type(await screen.findByLabelText('Email'), 'me@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That email and password do not match.');
  });
});
