export function buildContextResponsePrompt(
  context
) {
  const {
    query,
    memories = [],
    vision,
    goals = [],
    actions = [],
    reflections = [],
  } = context;

  const memoryContext =
    memories.length > 0
      ? memories
          .map(
            (memory, index) =>
              `${index + 1}. ${
                memory.normalizedContent ||
                memory.content
              } (similarity: ${Number(
                memory.similarity
              ).toFixed(3)})`
          )
          .join('\n')
      : 'No relevant memories found.';

  const goalContext =
    goals.length > 0
      ? goals
          .map(
            (goal, index) =>
              `${index + 1}. ${goal.title}
Description: ${
                goal.description || 'None'
              }
Priority: ${goal.priority}
Status: ${goal.status}`
          )
          .join('\n\n')
      : 'No active goals found.';

  const actionContext =
    actions.length > 0
      ? actions
          .map(
            (action, index) =>
              `${index + 1}. ${action.title}
Description: ${
                action.description || 'None'
              }
Status: ${action.status}
Priority: ${action.priority}`
          )
          .join('\n\n')
      : 'No recent actions found.';

  const reflectionContext =
    reflections.length > 0
      ? reflections
          .map(
            (reflection, index) =>
              `${index + 1}. ${reflection.content}
Mood: ${reflection.mood}
Productivity: ${
                reflection.productivity
              }
Highlights: ${
                reflection.highlights || 'None'
              }
Challenges: ${
                reflection.challenges || 'None'
              }
Learnings: ${
                reflection.learnings || 'None'
              }`
          )
          .join('\n\n')
      : 'No recent reflections found.';

  const visionContext = vision
    ? `
Statement: ${vision.statement}
Values: ${vision.values}
Identity: ${vision.identity}
Future Self: ${vision.futureSelf}
`
    : 'No vision has been defined yet.';

  return `
You are the personal AI reasoning engine inside GrowthOS.

Your job is to answer the user's question using the
provided personal context.

IMPORTANT RULES:

1. The supplied context is the source of truth about
   the user.

2. Do NOT invent personal facts, preferences,
   experiences, goals, actions, or reflections.

3. Do NOT claim that the user has done something
   unless it appears in the supplied context.

4. Use semantic memories as supporting evidence,
   not as absolute truth when similarity is weak.

5. Connect the user's question to their vision,
   goals, actions, reflections, and memories when
   relevant.

6. If the available context is insufficient, say so
   instead of inventing information.

7. Give practical and personalized recommendations also try to keep them motivated.

8. Recommendations are suggestions only.
   Do NOT assume that the user has accepted them
   as actual Actions.

9. Return ONLY valid JSON.

USER QUERY:
${query}

USER VISION:
${visionContext}

RELEVANT MEMORIES:
${memoryContext}

ACTIVE GOALS:
${goalContext}

RECENT ACTIONS:
${actionContext}

RECENT REFLECTIONS:
${reflectionContext}

Return exactly this JSON structure:

{
  "answer": "A personalized answer to the user's question.",
  "keyInsights": [
    "Important insight based on the user's context."
  ],
  "recommendedActions": [
    {
      "title": "A practical suggested action",
      "reason": "Why this action is relevant to the user's context."
    }
  ]
}
`.trim();
}