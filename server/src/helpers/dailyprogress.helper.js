function toJsDate(value) {
  if (!value) {
    return null;
  }

  // Already a JavaScript Date
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

  // Prisma 8 Temporal.Instant
  if (
    typeof value === 'object' &&
    typeof value.epochMilliseconds === 'number'
  ) {
    return new Date(value.epochMilliseconds);
  }

  // Fallback for strings / other date-like values
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error('INVALID_DATE_VALUE');
  }

  return date;
}

export function buildDailyProgress(actions) {
  return {
    total: actions.length,

    completed: actions.filter(
      (action) =>
        action.status === 'completed'
    ),

    inProgress: actions.filter(
      (action) =>
        action.status === 'in_progress'
    ),

    pending: actions.filter(
      (action) =>
        action.status === 'pending'
    ),

    cancelled: actions.filter(
      (action) =>
        action.status === 'cancelled'
    ),
  };
}

export function getDayRange(date) {
  const start = toJsDate(date);

  start.setHours(
    0,
    0,
    0,
    0
  );

  const end = new Date(start);

  end.setDate(
    end.getDate() + 1
  );

  return {
    start,
    end,
  };
}

export { toJsDate };