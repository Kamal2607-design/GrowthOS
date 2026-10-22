/**
 * Date and data helpers. The API sends timestamps as ISO instants; the
 * daily context also reports the server's time zone, which defines "today".
 */

export function localDateKey(value, timeZone) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone || undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function formatDayHeading(dateKey) {
  if (!dateKey) {
    return '';
  }

  // Noon UTC keeps the calendar day stable in every time zone.
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${dateKey}T12:00:00Z`));
}

export function formatShortDate(value, timeZone) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: timeZone || undefined,
  }).format(date);
}

/**
 * Converts an <input type="date"> value (YYYY-MM-DD) to an ISO instant.
 * The API requires a full timestamp; local noon avoids the date shifting
 * to the previous or next day in any time zone.
 */
export function dateInputToInstant(value) {
  if (!value) {
    return null;
  }

  const date = new Date(`${value}T12:00:00`);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function instantToDateInput(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (n) => String(n).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Parses a JSON-encoded list stored as text; tolerates arrays and junk. */
export function parseList(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function sortByDateDesc(items, field) {
  return [...items].sort(
    (a, b) => new Date(b[field]).getTime() - new Date(a[field]).getTime(),
  );
}

export function humanize(value) {
  if (!value) {
    return '';
  }

  const text = String(value).replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
