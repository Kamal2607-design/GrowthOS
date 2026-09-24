import { generateWithQwen } from './qwen.service.js';
import { buildActionSuggestionPrompt } from './action-prompt.service.js';

export async function generateActionSuggestions({
  vision,
  goal,
}) {
  const prompt = buildActionSuggestionPrompt({
    vision,
    goal,
  });

  console.log('Sending prompt to Qwen...');

  const result = await generateWithQwen(prompt);

  console.log('Qwen raw response:');
  console.log(result.response);

  let parsed;

  try {
    parsed = JSON.parse(result.response);
  } catch (error) {
    console.error('Failed to parse Qwen JSON:', error);
    console.error('Raw Qwen response:', result.response);

    throw new Error(
      'Qwen returned an invalid JSON response.'
    );
  }

  console.log(
    'Parsed Qwen response:',
    JSON.stringify(parsed, null, 2)
  );

  if (
    !parsed ||
    !Array.isArray(parsed.suggestions)
  ) {
    throw new Error(
      'Qwen response does not contain a valid suggestions array.'
    );
  }

  const suggestions = parsed.suggestions
    .map((suggestion) => ({
      title: suggestion.title,
      description: suggestion.description,
      reasoning: suggestion.reasoning,
      priority: suggestion.priority,
    }))
    .filter((suggestion) => suggestion.title);

  console.log(
    'Validated AI suggestions:',
    JSON.stringify(suggestions, null, 2)
  );

  return suggestions;
}