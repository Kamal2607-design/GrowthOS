export function buildReflectionAnalysisPrompt({
  reflection,
  vision,
  goals,
  actions,
}) {
  const visionContext = vision
    ? `
VISION:
Statement: ${vision.statement || 'N/A'}
Values: ${vision.values || 'N/A'}
Identity: ${vision.identity || 'N/A'}
Future Self: ${vision.futureSelf || 'N/A'}
`
    : `
VISION:
No vision has been defined yet.
`;

  const goalsContext =
    goals && goals.length > 0
      ? goals
          .map(
            (goal) => `
Goal:
ID: ${goal.id}
Title: ${goal.title}
Description: ${goal.description || 'N/A'}
Status: ${goal.status}
Priority: ${goal.priority}
Target Date: ${goal.targetDate || 'N/A'}
`
          )
          .join('\n')
      : 'No goals available.';

  const actionsContext =
    actions && actions.length > 0
      ? actions
          .map(
            (action) => `
Action:
Title: ${action.title}
Description: ${action.description || 'N/A'}
Status: ${action.status}
Priority: ${action.priority}
`
          )
          .join('\n')
      : 'No recent actions available.';

  return `
You are the reflection analysis engine for GrowthOS.

Analyze the user's daily reflection in the context of their
vision, goals, and actions.

Do NOT create or modify database records.
Do NOT assume facts that are not present in the provided data.
Do NOT give generic motivational advice.

Identify:
1. What happened today.
2. Productivity and mood patterns.
3. Important highlights.
4. Challenges.
5. Learnings.
6. How today's activity aligns with the user's goals.
7. A small number of practical recommended actions.
8. An Appreciation of the user's efforts and progress.

The recommended actions are suggestions only.
The user must explicitly accept a suggestion before it becomes
a real GrowthOS Action.

${visionContext}

USER REFLECTION:

Content:
${reflection.content}

Mood:
${reflection.mood || 'N/A'}

Productivity:
${reflection.productivity ?? 'N/A'}

Highlights:
${reflection.highlights || 'N/A'}

Challenges:
${reflection.challenges || 'N/A'}

Learnings:
${reflection.learnings || 'N/A'}

REFLECTION DATE:
${reflection.reflectionDate}

USER GOALS:

${goalsContext}

CURRENT ACTIONS:

${actionsContext}

Return ONLY valid JSON.

Use exactly this structure:

{
  "summary": "string",
  "moodAnalysis": "string",
  "productivityAnalysis": "string",
  "highlights": ["string"],
  "challenges": ["string"],
  "learnings": ["string"],
  "goalAlignment": [
    {
      "goal": "string",
      "alignment": "high | medium | low",
      "reason": "string"
    }
  ],
  "recommendedActions": [
    {
      "title": "string",
      "reason": "string"
    }
  ]
}
`;
}