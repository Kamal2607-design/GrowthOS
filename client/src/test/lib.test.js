import { describe, expect, it } from 'vitest';

import { ApiError, fetchCurrentUser, uploadDocument } from '../lib/api.js';
import { dateInputToInstant, formatDayHeading, localDateKey, parseList, parseObject } from '../lib/format.js';
import { isPlaceholderGoal } from '../lib/goals.js';
import { generationErrorMessage } from '../lib/messages.js';
import { mockApi } from './mockApi.js';

describe('ApiError', () => {
  it('reads a machine code from the error field', () => {
    const error = new ApiError(422, { success: false, error: 'DAILY_PLANNER_GOAL_MISMATCH' });

    expect(error.code).toBe('DAILY_PLANNER_GOAL_MISMATCH');
    expect(error.message).toBe('Request failed (422)');
  });

  it('prefers an explicit code and a human message', () => {
    const error = new ApiError(503, {
      error: 'The AI planner is temporarily unavailable',
      code: 'DAILY_PLANNER_AI_UNAVAILABLE',
    });

    expect(error.code).toBe('DAILY_PLANNER_AI_UNAVAILABLE');
    expect(error.message).toBe('The AI planner is temporarily unavailable');
  });

  it('uses the message field when present', () => {
    expect(new ApiError(400, { message: 'Goal title is required' }).message).toBe(
      'Goal title is required',
    );
  });
});

describe('api client', () => {
  it('sends cookies and treats 401 from /me as signed out', async () => {
    const api = mockApi({ 'GET /api/auth/me': { status: 401, body: { message: 'Authentication required' } } });

    await expect(fetchCurrentUser()).resolves.toBeNull();
    expect(api.calls[0].init.credentials).toBe('include');
  });

  it('uploads the raw file with its type and encoded name', async () => {
    const api = mockApi({
      'POST /api/documents/upload': { status: 201, body: { document: { id: 1 } } },
    });
    const file = new File(['%PDF-1.7'], 'My plan é.pdf', { type: 'application/pdf' });

    await expect(uploadDocument(file)).resolves.toEqual({ id: 1 });
    expect(api.calls[0].headers['Content-Type']).toBe('application/pdf');
    expect(api.calls[0].headers['X-File-Name']).toBe(encodeURIComponent('My plan é.pdf'));
    expect(api.calls[0].init.body).toBe(file);
  });

  it('reports an unreachable server clearly', async () => {
    globalThis.fetch = () => Promise.reject(new TypeError('Failed to fetch'));

    await expect(fetchCurrentUser()).rejects.toMatchObject({ status: 0 });
  });
});

describe('format helpers', () => {
  it('computes the calendar day in a time zone', () => {
    expect(localDateKey('2026-10-20T20:00:00Z', 'Asia/Calcutta')).toBe('2026-10-21');
    expect(localDateKey('2026-10-20T20:00:00Z', 'UTC')).toBe('2026-10-20');
    expect(localDateKey(null, 'UTC')).toBeNull();
  });

  it('formats the day heading', () => {
    expect(formatDayHeading('2026-10-21')).toBe('Wednesday 21 October');
  });

  it('turns a date input into a full ISO instant on the same day', () => {
    const instant = dateInputToInstant('2026-12-31');

    expect(instant).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(new Date(instant).getDate()).toBe(31);
    expect(dateInputToInstant('')).toBeNull();
  });

  it('parses stored JSON lists and objects defensively', () => {
    expect(parseList('["a","b"]')).toEqual(['a', 'b']);
    expect(parseList(['x'])).toEqual(['x']);
    expect(parseList('not json')).toEqual([]);
    expect(parseObject('{"summary":"ok"}')).toEqual({ summary: 'ok' });
    expect(parseObject('[1]')).toBeNull();
  });
});

describe('isPlaceholderGoal', () => {
  it('matches the server rule cases', () => {
    expect(isPlaceholderGoal({ title: 'INSUFFICIENT DATA GOAL' })).toBe(true);
    expect(isPlaceholderGoal({ title: 'TEST - Complete one measurable step' })).toBe(true);
    expect(isPlaceholderGoal({ title: '[Test] Morning routine' })).toBe(true);
    expect(isPlaceholderGoal({ title: 'Morning routine', description: 'Placeholder goal for UI testing' })).toBe(true);
    expect(isPlaceholderGoal({ title: 'Pass the AWS certification test' })).toBe(false);
    expect(isPlaceholderGoal({ title: 'Test drive a new running route' })).toBe(false);
    expect(isPlaceholderGoal({ title: 'Learn to play the guitar' })).toBe(false);
  });
});

describe('generationErrorMessage', () => {
  it('explains each planner rejection', () => {
    expect(generationErrorMessage({ status: 422, code: 'DAILY_PLANNER_GOAL_IS_PLACEHOLDER' })).toMatch(/test goal/);
    expect(generationErrorMessage({ status: 409, code: 'DUPLICATE_PENDING_SUGGESTION' })).toMatch(/repeated tasks/);
    expect(generationErrorMessage({ status: 503, code: 'DAILY_PLANNER_AI_UNAVAILABLE' })).toMatch(/Ollama/);
    expect(generationErrorMessage({ status: 422, code: 'SOMETHING_NEW' })).toMatch(/didn't pass validation/);
  });
});
