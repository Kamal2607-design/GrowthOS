export function buildActionPlannerPrompt(
  context
) {
  const {
    query,
    vision,
    memories = [],
    goals = [],
    actions = [],
    reflections = [],
  } = context;

  const visionContext = vision
    ? `
Statement: ${vision.statement}
Values: ${vision.values}
Identity: ${vision.identity}
Future Self: ${vision.futureSelf}
`
    : 'No vision has been defined yet.';

  const memoryContext =
    memories.length > 0
      ? memories
          .map(
            (memory, index) =>
              `${index + 1}. ${
                memory.normalizedContent ||
                memory.content
              }`
          )
          .join('\n')
      : 'No relevant memories found.';

  const goalContext =
    goals.length > 0
      ? goals
          .map(
            (goal) =>
              `Goal ID: ${goal.id}
Title: ${goal.title}
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
            (action) =>
              `Action ID: ${action.id}
Title: ${action.title}
Description: ${
                action.description || 'None'
              }
Status: ${action.status}
Priority: ${action.priority}
Goal ID: ${
                action.goalId ?? 'None'
              }`
          )
          .join('\n\n')
      : 'No recent actions found.';

  const reflectionContext =
    reflections.length > 0
      ? reflections
          .map(
            (reflection) =>
              `Reflection:
${reflection.content}

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

  return `
You are the Action Planning intelligence inside GrowthOS.

Your job is to suggest practical next actions for the
user based ONLY on the supplied context.

USER REQUEST:
${query}

USER VISION:
${visionContext}

RELEVANT MEMORIES:
${memoryContext}

ACTIVE GOALS:
${goalContext}

CURRENT ACTIONS:
${actionContext}

RECENT REFLECTIONS:
${reflectionContext}

IMPORTANT RULES:

1. Suggestions must be grounded in the supplied context.

2. Do not invent user facts, goals, actions,
   experiences, preferences, or achievements.

3. Do not suggest actions unrelated to the user's
   current goals, vision, memories, actions, or
   reflections unless absolutely necessary.

4. Prefer practical actions that the user can actually
   execute.

5. Avoid suggesting actions that are already completed.

6. Avoid duplicating an existing pending or in-progress
   action when possible.

7. A suggestion may reference a goal ONLY if that goal
   appears in the ACTIVE GOALS section.

8. When referencing a goal, copy the exact Goal ID from
   the ACTIVE GOALS section.

9. NEVER use a Goal ID from the CURRENT ACTIONS section
   as a Goal ID for a suggestion.

10. NEVER invent or guess a Goal ID.

11. If no active goal is appropriate for the suggestion,
    set goalId to null.

12. A goal ID that appears only in CURRENT ACTIONS but
    does not appear in ACTIVE GOALS is INVALID and MUST
    NOT be used.

13. Priority must be an integer from 1 to 5.
    1 = highest priority.
    5 = lowest priority.

14. Return between 1 and 3 suggestions.

15. These are suggestions only. Do not claim that the
    user has accepted or completed them.

16. Return ONLY valid JSON.

Return exactly:

{
  "suggestions": [
    {
      "title": "Short actionable title",
      "description": "What the user should actually do.",
      "priority": 1,
      "reasoning": "Why this action is relevant.",
      "goalId": 123
    }
  ]
}
`.trim();
}