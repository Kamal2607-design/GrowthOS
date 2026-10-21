import {
  isPlaceholderGoal,
} from './daily-planner-goal-relevance.service.js';

// Plain-language reasons the validator rejected a previous plan.
const REJECTION_REASONS = {
  DUPLICATE_EXISTING_ACTION:
    'it repeated an action the user already has pending or in progress',
  DUPLICATE_PENDING_SUGGESTION:
    'it repeated a suggestion that is already pending',
  DUPLICATE_GENERATED_SUGGESTION:
    'it contained two suggestions that were the same task',
  DAILY_PLANNER_GOAL_IS_PLACEHOLDER:
    'it assigned a suggestion to a test/placeholder goal',
  DAILY_PLANNER_GOAL_MISMATCH:
    'it assigned a suggestion to a goal the task does not support',
  DAILY_PLANNER_UNSUPPORTED_REFLECTION_CLAIM:
    'it claimed a reflection from today exists when none was recorded',
  DAILY_PLANNER_GOAL_NOT_ACTIVE_IN_CONTEXT:
    'it used a Goal ID that is not in ACTIVE GOALS',
  INVALID_DAILY_PLANNER_GOAL_REFERENCE:
    'it used a Goal ID that is not in ACTIVE GOALS',
};

export function describePlannerRejection(code) {
  return (
    REJECTION_REASONS[code] ??
    'the JSON did not follow the required structure and rules'
  );
}

function buildPreviousAttemptContext(previousAttempt) {
  if (!previousAttempt) {
    return '';
  }

  const rejectedTitle = previousAttempt.rejectedTitle
    ? `\nRejected suggestion: "${previousAttempt.rejectedTitle}"`
    : '';

  return `
PREVIOUS ATTEMPT REJECTED:
Your previous plan was rejected by the GrowthOS validator because ${describePlannerRejection(previousAttempt.code)}.${rejectedTitle}
Return a different plan that follows every rule. Do not repeat the rejected suggestion or anything similar to it.
`;
}

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
    previousAttempt = null,
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
Target Date: ${goal.targetDate || 'None'}${
            isPlaceholderGoal(goal)
              ? `
Planning status: Test/placeholder goal. Do not assign suggestions to this goal.`
              : ''
          }`,
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
    : `No reflection has been recorded today.
Do not claim, quote, or imply that the user reflected, reported,
or wrote anything today.`;

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
    ? `These memories are historical context. They are not today's
reflection and not evidence of anything done today.

${relevantMemories
  .map(
    (memory) => `Memory ID: ${memory.memoryId}
Similarity: ${memory.similarity ?? 'Unknown'}
Content: ${memory.content}`,
  )
  .join('\n\n')}`
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

  // Small models tend to copy listed tasks back as "suggestions", so the
  // titles are repeated as an explicit exclusion list right before the
  // output instructions, where the model attends most.
  const alreadyPlannedTitles = [
    ...(currentActions.pending ?? []),
    ...(currentActions.inProgress ?? []),
    ...(currentActions.overdue ?? []),
    ...pendingSuggestions,
  ]
    .map((item) => item.title)
    .filter((title, index, titles) => title && titles.indexOf(title) === index);

  const alreadyPlannedContext = alreadyPlannedTitles.length > 0
    ? alreadyPlannedTitles.map((title) => `- ${title}`).join('\n')
    : '- (nothing yet)';

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

CURRENT ACTIONS (already on the user's list; never suggest these again):
${actionContext}

EXISTING PENDING SUGGESTIONS (already proposed; never suggest these again):
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
${buildPreviousAttemptContext(previousAttempt)}
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

K. Never assign a suggestion to a goal marked
   "Planning status: Test/placeholder goal". Use the meaningful
   active goal the task clearly supports, or goalId: null.

L. If TODAY'S REFLECTION says no reflection has been recorded,
   never write that the user reflected, reported, noted, or
   completed anything today. Never cite "today's reflection".
   A relevant memory is historical and must not be presented
   as today's reflection or as proof of a same-day activity.

ALREADY PLANNED. DO NOT SUGGEST ANY OF THESE OR A REWORDING OF THEM:
${alreadyPlannedContext}

Every suggestion must be a NEW task that is not in the list above.
If an existing task matters most, do not repeat it: suggest a different,
complementary next step (for example preparation, review, or the step
after it), or return fewer suggestions.

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
