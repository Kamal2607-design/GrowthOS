import { db } from '../prisma/db.ts';

import { getVision } from './vision.service.js';
import { getGoals } from './goal.service.js';
import { getActions } from './action.service.js';
import { getActionSuggestions } from './action-suggestion.service.js';
import { getReflections } from './reflection.service.js';
import { buildDailyContext } from './daily-growth-context.builder.js';

async function fetchOrThrow(errorCode, operation) {
  try {
    return await operation();
  } catch (cause) {
    const error = new Error(errorCode, { cause });
    error.code = errorCode;
    throw error;
  }
}

function getCurrentDayContext() {
  const now = Temporal.Now.zonedDateTimeISO();

  return {
    date: now.toPlainDate().toString(),
    timeZoneId: now.timeZoneId,
  };
}

function getLocalDateKey(value, timeZoneId) {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    return Temporal.Instant
      .from(value)
      .toZonedDateTimeISO(timeZoneId)
      .toPlainDate()
      .toString();
  } catch {
    return null;
  }
}

function sortByInstantDescending(records, fieldName, compareInstants) {
  return [...records].sort((a, b) => {
    try {
      return compareInstants(a[fieldName], b[fieldName]);
    } catch {
      return 0;
    }
  });
}

export async function getTodayDailyContext(userId) {
  if (!Number.isInteger(userId)) {
    const error = new Error('INVALID_USER_ID');
    error.code = 'INVALID_USER_ID';
    throw error;
  }

  const { date, timeZoneId } = getCurrentDayContext();

  const [vision, goals, actions, suggestions, reflections] =
    await Promise.all([
      fetchOrThrow('DAILY_CONTEXT_VISION_FETCH_FAILED', () =>
        getVision(userId)
      ),
      fetchOrThrow('DAILY_CONTEXT_GOALS_FETCH_FAILED', () =>
        getGoals(userId)
      ),
      fetchOrThrow('DAILY_CONTEXT_ACTIONS_FETCH_FAILED', () =>
        getActions(userId)
      ),
      fetchOrThrow('DAILY_CONTEXT_SUGGESTIONS_FETCH_FAILED', () =>
        getActionSuggestions(userId, { status: 'pending' })
      ),
      fetchOrThrow('DAILY_CONTEXT_REFLECTIONS_FETCH_FAILED', () =>
        getReflections(userId)
      ),
    ]);

  const dateKeyForInstant = (value) =>
    getLocalDateKey(value, timeZoneId);

  const todayReflection = sortByInstantDescending(
    reflections.filter(
      (reflection) =>
        dateKeyForInstant(reflection.reflectionDate) === date
    ),
    'reflectionDate',
    (left, right) => Temporal.Instant.compare(
      Temporal.Instant.from(right),
      Temporal.Instant.from(left),
    ),
  )[0] || null;

  let reflectionAnalysis = null;

  if (todayReflection) {
    reflectionAnalysis = await fetchOrThrow(
      'DAILY_CONTEXT_REFLECTION_ANALYSIS_FETCH_FAILED',
      () => db.orm.public.ReflectionAnalysis.first({
        userId,
        reflectionId: todayReflection.id,
      }),
    );
  }

  return buildDailyContext({
    date,
    timeZoneId,
    vision,
    goals,
    actions,
    suggestions,
    reflections,
    reflectionAnalysis,
    dateKeyForInstant,
  });
}
