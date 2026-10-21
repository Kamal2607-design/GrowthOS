export function buildDailyPlannerPrompt(context) {
  if (!context || typeof context !== 'object') {
    throw new Error('DAILY_PLANNER_CONTEXT_REQUIRED');
  }

  const {
    date,
    timeZone,
    vision,
    activeGoals = [],
    currentActions = {},
    pendingSuggestions = [],
    reflection,
    reflectionAnalysis,
    relevantMemories = [],
    goalProgress = [],
    dataQuality = {},
  } = context;

  const visionContext = vision
    ? `
Statement: ${vision.statement ?? 'None'}
Values: ${vision.values ?? 'None'}
Identity: ${vision.identity ?? 'None'}
Future Self: ${vision.futureSelf ?? 'None'}
`
    : 'No vision has been defined yet.';

  const goalContext = activeGoals.length > 0
    ? activeGoals
        .map(
          (goal) => `Goal ID: ${goal.id}
Title: ${goal.title}
Description: ${goal.description || 'None'}
Priority: ${goal.priority}
Target Date: ${goal.targetDate || 'None'}`,
        )
        .join('\n\n')
    : 'No active goals found.';

  const actionContextParts = [];

  if (currentActions.pending?.length > 0) {
    actionContextParts.push(
      `PENDING ACTIONS:
${currentActions.pending
  .map(
    (action) => `Action ID: ${action.id}
Title: ${action.title}
Description: ${action.description || 'None'}
Goal ID: ${action.goalId ?? 'None'}
Priority: ${action.priority}
Due Date: ${action.dueDate || 'None'}`,
  )
  .join('\n\n')}`,
    );
  }

  if (currentActions.inProgress?.length > 0) {
    actionContextParts.push(
      `IN-PROGRESS ACTIONS:
${currentActions.inProgress
  .map(
    (action) => `Action ID: ${action.id}
Title: ${action.title}
Description: ${action.description || 'None'}
Goal ID: ${action.goalId ?? 'None'}
Priority: ${action.priority}
Due Date: ${action.dueDate || 'None'}`,
  )
  .join('\n\n')}`,
    );
  }

  if (currentActions.completedToday?.length > 0) {
    actionContextParts.push(
      `COMPLETED TODAY:
${currentActions.completedToday
  .map(
    (action) => `Action ID: ${action.id}
Title: ${action.title}
Goal ID: ${action.goalId ?? 'None'}`,
  )
  .join('\n\n')}`,
    );
  }

  if (currentActions.overdue?.length > 0) {
    actionContextParts.push(
      `OVERDUE ACTIONS:
${currentActions.overdue
  .map(
    (action) => `Action ID: ${action.id}
Title: ${action.title}
Description: ${action.description || 'None'}
Goal ID: ${action.goalId ?? 'None'}
Priority: ${action.priority}
Due Date: ${action.dueDate || 'None'}`,
  )
  .join('\n\n')}`,
    );
  }

  const actionContext = actionContextParts.length > 0
    ? actionContextParts.join('\n\n')
    : 'No current actions found.';

  const pendingSuggestionContext = pendingSuggestions.length > 0
    ? pendingSuggestions
        .map(
          (suggestion) => `Suggestion ID: ${suggestion.id}
Title: ${suggestion.title}
Description: ${suggestion.description || 'None'}
Goal ID: ${suggestion.goalId ?? 'None'}
Priority: ${suggestion.priority}
Reasoning: ${suggestion.reasoning || 'None'}`,
        )
        .join('\n\n')
    : 'No pending suggestions found.';

  const reflectionContext = reflection
    ? `
Reflection ID: ${reflection.id}
Content: ${reflection.content || 'None'}
Mood: ${reflection.mood || 'None'}
Productivity: ${reflection.productivity ?? 'None'}
Highlights: ${reflection.highlights || 'None'}
Challenges: ${reflection.challenges || 'None'}
Learnings: ${reflection.learnings || 'None'}
`
    : 'No reflection has been recorded today.';

  const reflectionAnalysisContext = reflectionAnalysis
    ? `
Summary: ${reflectionAnalysis.summary || 'None'}

Challenges:
${JSON.stringify(reflectionAnalysis.challenges ?? [])}

Learnings:
${JSON.stringify(reflectionAnalysis.learnings ?? [])}

Highlights:
${JSON.stringify(reflectionAnalysis.highlights ?? [])}

Goal Alignment:
${JSON.stringify(reflectionAnalysis.goalAlignment ?? [])}

Progress Analysis:
${JSON.stringify(reflectionAnalysis.progressAnalysis ?? null)}

Recommended Actions:
${JSON.stringify(reflectionAnalysis.recommendedActions ?? [])}
`
    : 'No reflection analysis is available.';

  const memoryContext = relevantMemories.length > 0
    ? relevantMemories
        .map(
          (memory) => `Memory ID: ${memory.memoryId}
Similarity: ${memory.similarity ?? 'Unknown'}
Content: ${memory.content}`,
        )
        .join('\n\n')
    : dataQuality.memoryStatus === 'unavailable'
      ? 'Memory retrieval is unavailable. Relevant memories are unknown.'
      : 'No relevant memories were retrieved.';

  const goalProgressContext = goalProgress.length > 0
    ? goalProgress
        .map((item) => {
          if (item.status !== 'available') {
            return `Goal ID: ${item.goalId}
Progress status: Unavailable.
Do not infer this goal's progress.`;
          }

          return `Goal ID: ${item.goalId}
Progress: ${JSON.stringify(item.progress)}
Activity: ${JSON.stringify(item.activity)}
Reflection correlation: ${JSON.stringify(
            item.reflectionCorrelation,
          )}`;
        })
        .join('\n\n')
    : 'No goal progress data is available for this planning request.';

  const dataAvailabilityContext = `
Memory retrieval status: ${dataQuality.memoryStatus ?? 'unknown'}
Goal progress status: ${dataQuality.goalProgressStatus ?? 'unknown'}
`;

  return `
You are the Daily Action Planning intelligence inside GrowthOS.

Your job is to recommend a small number of practical next actions
for the user based ONLY on the supplied daily growth context.

The user does not automatically accept your suggestions.

Your output will be reviewed by the GrowthOS backend and presented
as suggestions for the user to decide whether to accept.

DATE:
${date ?? 'Unknown'}

TIMEZONE:
${timeZone ?? 'Unknown'}

USER VISION:
${visionContext}

ACTIVE GOALS:
${goalContext}

CURRENT ACTIONS:
${actionContext}

EXISTING PENDING SUGGESTIONS:
${pendingSuggestionContext}

TODAY'S REFLECTION:
${reflectionContext}

REFLECTION ANALYSIS:
${reflectionAnalysisContext}

RELEVANT PERSONAL MEMORIES:
${memoryContext}

OBJECTIVE GOAL PROGRESS:
${goalProgressContext}

DATA AVAILABILITY:
${dataAvailabilityContext}

IMPORTANT RULES:

1. Ground every suggestion strictly in the supplied context.

2. Do not invent user facts, goals, achievements, preferences,
   experiences, actions, reflections, memories, or progress.

3. Suggestions should represent practical next actions that the
   user could realistically execute.

4. Prefer actions that move an ACTIVE GOAL forward.

5. A suggestion may reference a goal ONLY when that goal appears
   in ACTIVE GOALS.

6. When referencing a goal, copy the exact Goal ID from ACTIVE GOALS.

7. NEVER use a Goal ID merely because it appears in CURRENT ACTIONS.

8. NEVER invent or guess a Goal ID.

9. If no active goal is appropriate, use:
   "goalId": null

10. Do not suggest an action that is already completed today.

11. Do not duplicate an existing pending or in-progress action.

12. Do not simply repeat an existing pending suggestion.

13. If an existing pending suggestion is already appropriate,
    prefer improving or refining the direction internally rather
    than returning the same suggestion.

14. Reflection insights may influence suggestions, but only when
    supported by the supplied reflection or reflection analysis.

15. Do not assume that a goal has been achieved merely because
    related actions were completed.

16. Prefer focused, concrete actions over vague advice.

17. Return between 1 and 3 suggestions.

18. Priority must be an integer from 1 to 5.

19. Priority meaning:
    1 = highest priority
    2 = high priority
    3 = medium priority
    4 = low priority
    5 = lowest priority

20. Suggestions are NOT accepted Actions.
    Never claim that the user has accepted, started, or completed
    a suggestion.

21. Use relevant memories only when they meaningfully support
    the current vision or an active goal. A memory is context,
    not proof that an action was completed.

22. Treat action counts and completion percentages as evidence
    of activity, not proof of meaningful personal progress.

23. Consider reflection insights alongside objective activity.
    Do not automatically treat high activity as meaningful progress
    or low activity as a personal failure.

24. If memory retrieval is unavailable, do not assume that no
    relevant memories exist.

25. If goal progress is unavailable for a goal, do not invent
    progress values or conclusions for that goal.

26. If there is insufficient evidence for a recommendation,
    choose a small, grounded next step rather than inventing context.

27. You are generating suggestions only. Do not create or modify
    Goals, Actions, or Memories.

GOAL QUALITY AND RELEVANCE RULES:

A. An active goal is not automatically a meaningful or actionable goal.

B. Inspect the exact title and description of every goal before
   assigning it to a suggestion.

C. If a goal title or description clearly identifies it as a test,
   placeholder, dummy goal, or insufficient-data test fixture,
   do not generate normal personal-growth suggestions for that goal.

D. Do not assign a fitness, nutrition, coding, career, or product
   development suggestion to a test or placeholder goal.

E. Assign goalId: null when no meaningful active goal clearly
   supports the proposed action.

F. A suggestion must be relevant to both the goal's intended
   outcome and its description. Do not select a goal merely
   because it is active or has a high priority.

G. An action associated with a test goal is evidence of test data,
   not evidence of a real personal objective.

H. Do not assume that a pending action has been completed.
   Do not describe historical memory as today's reflection.

I. Before returning the plan, compare every proposed suggestion
   against all supplied pending Suggestions and pending or
   in-progress Actions. Reject repetitions and superficial
   rewordings of existing tasks.

J. If the context does not support enough distinct, useful
   suggestions, return fewer suggestions rather than inventing
   facts or repeating tasks.

28. Return ONLY valid JSON.

29. Do not return Markdown.

30. Do not wrap the JSON in code fences.

31. Do not include explanatory text outside the JSON.

Return exactly this structure:

{
  "suggestions": [
    {
      "title": "Short actionable title",
      "description": "What the user should actually do.",
      "priority": 1,
      "reasoning": "Why this action is relevant to the user's current context.",
      "goalId": 123
    }
  ]
}
`.trim();
}
