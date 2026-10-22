import {
  areLikelyDuplicateTitles,
} from './ai/daily-planner-quality.service.js';

/**
 * Titles of everything the user already has open: pending or
 * in-progress Actions and pending ActionSuggestions. Pass a
 * transaction as `client` to read inside it.
 */
export async function loadOpenTitles(client, userId) {
  const [actions, pendingSuggestions] = await Promise.all([
    client.orm.public.Action.where({ userId }).all(),
    client.orm.public.ActionSuggestion.where({ userId, status: 'pending' }).all(),
  ]);

  return [
    ...actions
      .filter((action) => ['pending', 'in_progress'].includes(action.status))
      .map((action) => action.title),
    ...pendingSuggestions.map((suggestion) => suggestion.title),
  ];
}

/**
 * Keeps only candidates that do not repeat an existing title or an
 * earlier candidate. Uses the same conservative title heuristics as the
 * daily planner. Returns { fresh, skipped }.
 */
export function filterNewSuggestions(candidates, existingTitles) {
  const known = [...(existingTitles ?? [])];
  const fresh = [];
  const skipped = [];

  for (const candidate of candidates ?? []) {
    if (known.some((title) => areLikelyDuplicateTitles(candidate.title, title))) {
      skipped.push(candidate);
      continue;
    }

    fresh.push(candidate);
    known.push(candidate.title);
  }

  return { fresh, skipped };
}
