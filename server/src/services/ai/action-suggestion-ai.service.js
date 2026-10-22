import { generateWithQwen } from './qwen.service.js';
import { buildActionSuggestionPrompt } from './action-prompt.service.js';

const MAX_SUGGESTIONS = 5;

/**
 * Validates and normalises Qwen's per-goal suggestions. Entries without a
 * usable title are dropped; other fields are type-checked and defaulted.
 */
export function normalizeActionSuggestions(parsed) {
  if (!parsed || !Array.isArray(parsed.suggestions)) {
    throw new Error('INVALID_AI_SUGGESTIONS');
  }

  const text = (value) =>
    typeof value === 'string' && value.trim() ? value.trim() : null;

  return parsed.suggestions
    .filter(
      (suggestion) =>
        suggestion &&
        typeof suggestion === 'object' &&
        text(suggestion.title)
    )
    .slice(0, MAX_SUGGESTIONS)
    .map((suggestion) => ({
      title: text(suggestion.title),
      description: text(suggestion.description),
      reasoning: text(suggestion.reasoning),
      priority:
        Number.isInteger(suggestion.priority) &&
        suggestion.priority >= 1 &&
        suggestion.priority <= 5
          ? suggestion.priority
          : 3,
    }));
}

export async function generateActionSuggestions({
  vision,
  goal,
  existingTitles = [],
}) {
  const prompt = buildActionSuggestionPrompt({
    vision,
    goal,
    existingTitles,
  });

  const result = await generateWithQwen(prompt, {
    maxTokens: 1024,
  });

  let parsed;

  try {
    parsed = JSON.parse(result.response);
  } catch {
    throw new Error('QWEN_INVALID_JSON_RESPONSE');
  }

  const suggestions = normalizeActionSuggestions(parsed);

  if (suggestions.length === 0) {
    throw new Error('INVALID_AI_SUGGESTIONS');
  }

  return suggestions;
}
