import { localDateKey } from './format.js';

function shiftDateKey(dateKey, days) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function labelFor(dateKey, options) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', ...options }).format(
    new Date(`${dateKey}T12:00:00Z`),
  );
}

/**
 * Completed and created actions per day for the last `days` days, ending
 * on `todayKey` (YYYY-MM-DD in the user's time zone). Includes actions
 * that are not linked to a goal.
 */
export function dailyActivity(actions, todayKey, timeZone, days = 14) {
  const buckets = new Map();

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const key = shiftDateKey(todayKey, -offset);
    buckets.set(key, {
      date: key,
      label: labelFor(key, { weekday: 'short', day: 'numeric', month: 'short' }),
      shortLabel: labelFor(key, { day: 'numeric', month: 'short' }),
      completed: 0,
      created: 0,
    });
  }

  for (const action of actions ?? []) {
    const created = buckets.get(localDateKey(action.createdAt, timeZone));
    if (created) created.created += 1;

    if (action.status === 'completed') {
      const completed = buckets.get(localDateKey(action.completedAt, timeZone));
      if (completed) completed.completed += 1;
    }
  }

  return [...buckets.values()];
}

/**
 * Consecutive days (ending today, or yesterday if today has nothing yet)
 * on which `hasActivity(dateKey)` is true.
 */
export function streakLength(todayKey, hasActivity, maxDays = 365) {
  let start = hasActivity(todayKey) ? 0 : 1;
  let count = 0;

  for (let offset = start; offset < maxDays; offset += 1) {
    if (!hasActivity(shiftDateKey(todayKey, -offset))) break;
    count += 1;
  }

  return count;
}

export function completionStreak(activity) {
  const byDate = new Map(activity.map((day) => [day.date, day.completed]));
  const todayKey = activity[activity.length - 1]?.date;
  if (!todayKey) return 0;
  return streakLength(todayKey, (key) => (byDate.get(key) ?? 0) > 0, activity.length);
}

export function reflectionStreak(reflections, todayKey, timeZone) {
  const days = new Set(
    (reflections ?? []).map((reflection) => localDateKey(reflection.reflectionDate, timeZone)),
  );
  return streakLength(todayKey, (key) => days.has(key));
}

export function greeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return 'Working late';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(user) {
  const name = (user?.name || '').trim();
  return name ? name.split(/\s+/)[0] : '';
}
