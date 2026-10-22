function formatVision(vision) {
  if (typeof vision === 'string') {
    return vision.trim() || 'No vision provided.';
  }

  if (!vision || typeof vision !== 'object') {
    return 'No vision provided.';
  }

  // The caller passes the Vision record; interpolating it
  // directly would print "[object Object]".
  const lines = [
    ['Statement', vision.statement],
    ['Values', vision.values],
    ['Identity', vision.identity],
    ['Future Self', vision.futureSelf],
  ]
    .filter(([, value]) =>
      typeof value === 'string' && value.trim()
    )
    .map(([label, value]) => `${label}: ${value.trim()}`);

  return lines.length > 0
    ? lines.join('\n')
    : 'No vision provided.';
}

export function buildActionSuggestionPrompt({
  vision,
  goal,
  existingTitles = [],
}) {
  const alreadyPlanned = existingTitles.length > 0
    ? existingTitles.map((title) => `- ${title}`).join('\n')
    : 'Nothing yet.';

  return `
You are an AI productivity coach inside GrowthOS.

Your job is to help a user make practical progress toward their goal.

USER VISION:
${formatVision(vision)}

USER GOAL:
${goal.title}

GOAL DESCRIPTION:
${goal.description || "No description provided."}

ALREADY PLANNED (open actions and pending suggestions):
${alreadyPlanned}

Generate 3 practical actions that the user can realistically execute.

Requirements:

1. Actions must directly contribute to THIS goal, in the goal's own
   domain. For a fitness goal suggest training, nutrition, sleep or
   recovery steps; for a career or learning goal suggest work or study
   steps. Use the vision only as background: never turn a goal into a
   coding, product or business project unless the goal itself is about that.
2. Actions should be specific and actionable.
3. Avoid vague advice.
4. Prefer actions that can be completed within days or weeks.
5. Do not repeat or reword anything listed under ALREADY PLANNED.
6. Prioritize actions from highest to lowest importance.

Return ONLY valid JSON in this exact format:

{
  "suggestions": [
    {
      "title": "Short action title",
      "description": "Specific description of what the user should do.",
      "reasoning": "Why this action contributes to the goal.",
      "priority": 1
    }
  ]
}
`;
}