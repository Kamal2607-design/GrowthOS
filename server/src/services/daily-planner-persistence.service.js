import {
  db,
} from '../prisma/db.ts';

export function normalizeDailyPlannerTitle(
  value
) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ');
}

function validatePersistenceInput(
  userId,
  context,
  plan
) {
  if (
    !Number.isInteger(userId) ||
    userId <= 0
  ) {
    throw new Error(
      'INVALID_USER_ID'
    );
  }

  if (
    !context ||
    typeof context !== 'object'
  ) {
    throw new Error(
      'DAILY_PLANNER_CONTEXT_REQUIRED'
    );
  }

  if (
    !plan ||
    typeof plan !== 'object' ||
    !Array.isArray(plan.suggestions)
  ) {
    throw new Error(
      'INVALID_DAILY_PLANNER_PLAN'
    );
  }

  if (
    plan.suggestions.length < 1 ||
    plan.suggestions.length > 3
  ) {
    throw new Error(
      'INVALID_DAILY_PLANNER_COUNT'
    );
  }

  for (
    const suggestion of plan.suggestions
  ) {
    if (
      !suggestion ||
      typeof suggestion.title !== 'string' ||
      !suggestion.title.trim()
    ) {
      throw new Error(
        'INVALID_DAILY_PLANNER_SUGGESTION_TITLE'
      );
    }

    if (
      typeof suggestion.description !==
        'string' ||
      !suggestion.description.trim()
    ) {
      throw new Error(
        'INVALID_DAILY_PLANNER_SUGGESTION_DESCRIPTION'
      );
    }

    if (
      typeof suggestion.reasoning !==
        'string' ||
      !suggestion.reasoning.trim()
    ) {
      throw new Error(
        'INVALID_DAILY_PLANNER_SUGGESTION_REASONING'
      );
    }

    if (
      !Number.isInteger(
        suggestion.priority
      ) ||
      suggestion.priority < 1 ||
      suggestion.priority > 5
    ) {
      throw new Error(
        'INVALID_DAILY_PLANNER_SUGGESTION_PRIORITY'
      );
    }

    if (
      suggestion.goalId !== null &&
      !Number.isInteger(
        suggestion.goalId
      )
    ) {
      throw new Error(
        'INVALID_DAILY_PLANNER_SUGGESTION_GOAL_ID'
      );
    }
  }

  const reflectionId =
    context.reflection?.id ?? null;

  if (
    reflectionId !== null &&
    (
      !Number.isInteger(reflectionId) ||
      reflectionId <= 0
    )
  ) {
    throw new Error(
      'INVALID_REFLECTION_ID'
    );
  }
}

async function verifyActiveGoalOwnership(
  tx,
  userId,
  goalId
) {
  if (goalId === null) {
    return;
  }

  const goal =
    await tx.orm.public.Goal.first({
      id: goalId,
      userId,
      status: 'active',
    });

  if (!goal) {
    throw new Error(
      'DAILY_PLANNER_GOAL_NOT_ACTIVE_OR_OWNED'
    );
  }
}

async function verifyReflectionOwnership(
  tx,
  userId,
  reflectionId
) {
  if (reflectionId === null) {
    return;
  }

  const reflection =
    await tx.orm.public.Reflection.first({
      id: reflectionId,
      userId,
    });

  if (!reflection) {
    throw new Error(
      'DAILY_PLANNER_REFLECTION_NOT_OWNED'
    );
  }
}

function findDuplicateAction(
  suggestion,
  actions
) {
  const normalizedTitle =
    normalizeDailyPlannerTitle(
      suggestion.title
    );

  return actions.find((action) => {
    if (
      ![
        'pending',
        'in_progress',
      ].includes(action.status)
    ) {
      return false;
    }

    return (
      normalizeDailyPlannerTitle(
        action.title
      ) === normalizedTitle
    );
  });
}

function findDuplicatePendingSuggestion(
  suggestion,
  suggestions
) {
  const normalizedTitle =
    normalizeDailyPlannerTitle(
      suggestion.title
    );

  return suggestions.find(
    (existing) =>
      existing.status === 'pending' &&
      normalizeDailyPlannerTitle(
        existing.title
      ) === normalizedTitle
  );
}

export async function persistDailyActionSuggestions(
  userId,
  context,
  plan
) {
  validatePersistenceInput(
    userId,
    context,
    plan
  );

  const reflectionId =
    context.reflection?.id ?? null;

  return db.transaction(async (tx) => {
    /*
     * 1. Revalidate Goal ownership and status.
     *
     * The context may have changed between
     * generation and persistence.
     */
    const goalIds = [
      ...new Set(
        plan.suggestions
          .map(
            (suggestion) =>
              suggestion.goalId
          )
          .filter(
            (goalId) =>
              goalId !== null
          )
      ),
    ];

    for (const goalId of goalIds) {
      await verifyActiveGoalOwnership(
        tx,
        userId,
        goalId
      );
    }

    /*
     * 2. Revalidate Reflection ownership.
     */
    await verifyReflectionOwnership(
      tx,
      userId,
      reflectionId
    );

    /*
     * 3. Read existing user-owned records.
     *
     * These checks provide a final duplicate
     * safeguard immediately before insertion.
     */
    const existingActions =
      await tx.orm.public.Action
        .where({
          userId,
        })
        .all();

    const existingPendingSuggestions =
      await tx.orm.public.ActionSuggestion
        .where({
          userId,
          status: 'pending',
        })
        .all();

    /*
     * 4. Validate the entire batch before
     * creating any records.
     */
    const batchTitles = new Set();

    for (
      const suggestion of plan.suggestions
    ) {
      const normalizedTitle =
        normalizeDailyPlannerTitle(
          suggestion.title
        );

      if (!normalizedTitle) {
        throw new Error(
          'INVALID_NORMALIZED_SUGGESTION_TITLE'
        );
      }

      const duplicateAction =
        findDuplicateAction(
          suggestion,
          existingActions
        );

      if (duplicateAction) {
        throw new Error(
          'DUPLICATE_EXISTING_ACTION'
        );
      }

      const duplicateSuggestion =
        findDuplicatePendingSuggestion(
          suggestion,
          existingPendingSuggestions
        );

      if (duplicateSuggestion) {
        throw new Error(
          'DUPLICATE_PENDING_SUGGESTION'
        );
      }

      if (
        batchTitles.has(normalizedTitle)
      ) {
        throw new Error(
          'DUPLICATE_GENERATED_SUGGESTION'
        );
      }

      batchTitles.add(
        normalizedTitle
      );
    }

    /*
     * 5. Persist all suggestions in the
     * same transaction.
     *
     * Status and source are controlled by
     * the backend, not the AI model.
     */
    const createdSuggestions = [];

    for (
      const suggestion of plan.suggestions
    ) {
      const createdSuggestion =
        await tx.orm.public.ActionSuggestion.create({
          userId,

          goalId:
            suggestion.goalId,

          reflectionId,

          title:
            suggestion.title.trim(),

          description:
            suggestion.description.trim(),

          priority:
            suggestion.priority,

          reasoning:
            suggestion.reasoning.trim(),

          status: 'pending',

          source: 'ai',
        });

      createdSuggestions.push(
        createdSuggestion
      );
    }

    return {
      createdCount:
        createdSuggestions.length,

      suggestions:
        createdSuggestions,
    };
  });
}