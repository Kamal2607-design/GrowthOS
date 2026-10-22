import { db } from '../prisma/db.ts';

import {
  analyzeReflection,
} from './ai/reflection-analysis-ai.service.js';

import {
  createActionSuggestion,
} from './action-suggestion.service.js';

import {
  areLikelyDuplicateTitles,
} from './ai/daily-planner-quality.service.js';

import {
  getDayRange,buildDailyProgress
} from '../helpers/dailyprogress.helper.js';

async function getDailyActions(
  userId,
  reflectionDate
) {
  const {
    start,
    end,
  } = getDayRange(reflectionDate);

  const actions =
    await db.orm.public.Action
      .where({
        userId,
      })
      .all();

  return actions.filter((action) => {
    const createdAt =
    action.createdAt
        ? new Date(
            action.createdAt.epochMilliseconds
        )
        : null;

    const completedAt =
    action.completedAt
        ? new Date(
            action.completedAt.epochMilliseconds
        )
        : null;
    const createdToday =
      createdAt >= start &&
      createdAt < end;

    const completedToday =
      completedAt &&
      completedAt >= start &&
      completedAt < end;

    return (
      createdToday ||
      completedToday
    );
  });
}

async function getReflectionForUser(
  userId,
  reflectionId
) {
  const reflection =
    await db.orm.public.Reflection.first({
      id: reflectionId,
      userId,
    });

  if (!reflection) {
    throw new Error('REFLECTION_NOT_FOUND');
  }

  return reflection;
}


async function getUserVision(userId) {
  return await db.orm.public.Vision.first({
    userId,
  });
}


async function getUserGoals(userId) {
  return await db.orm.public.Goal
    .where({
      userId,
    })
    .all();
}

function normalizeRecommendations(recommendedActions) {
  return (Array.isArray(recommendedActions) ? recommendedActions : [])
    .filter(
      (recommendation) =>
        recommendation &&
        typeof recommendation.title === 'string' &&
        recommendation.title.trim()
    )
    .map((recommendation) => ({
      title: recommendation.title.trim(),
      reason:
        typeof recommendation.reason === 'string' &&
        recommendation.reason.trim()
          ? recommendation.reason.trim()
          : null,
    }));
}


/*
 * Replaces this reflection's pending AI suggestions with the
 * new analysis's recommendations, in one transaction:
 * - previous pending suggestions for the reflection are expired
 *   (the new analysis supersedes them, even when it recommends nothing);
 * - recommendations repeating an active Action, another pending
 *   suggestion, or each other are skipped.
 * A failure leaves the previous suggestions untouched.
 */
async function createReflectionSuggestions(
  userId,
  reflectionId,
  recommendedActions
) {
  const recommendations =
    normalizeRecommendations(recommendedActions);

  return db.transaction(async (tx) => {
    await tx.orm.public.ActionSuggestion
      .where({
        userId,
        reflectionId,
        source: 'ai',
        status: 'pending',
      })
      .updateAll({
        status: 'expired',
      });

    const activeActions = (
      await tx.orm.public.Action
        .where({ userId })
        .all()
    ).filter((action) =>
      ['pending', 'in_progress'].includes(action.status)
    );

    const pendingSuggestions =
      await tx.orm.public.ActionSuggestion
        .where({
          userId,
          status: 'pending',
        })
        .all();

    const knownTitles = [
      ...activeActions.map((action) => action.title),
      ...pendingSuggestions.map((suggestion) => suggestion.title),
    ];

    const createdSuggestions = [];

    for (const recommendation of recommendations) {
      if (
        knownTitles.some((title) =>
          areLikelyDuplicateTitles(recommendation.title, title)
        )
      ) {
        continue;
      }

      const suggestion =
        await createActionSuggestion(
          userId,
          {
            title: recommendation.title,
            description: null,
            goalId: null,
            reflectionId,
            priority: 0,
            reasoning: recommendation.reason,
            source: 'ai',
          },
          tx
        );

      createdSuggestions.push(suggestion);
      knownTitles.push(suggestion.title);
    }

    return createdSuggestions;
  });
}


export async function analyzeReflectionAndCreateSuggestions(
  userId,
  reflectionId
) {

  // ---------------------------------------------
  // 1. Get reflection
  // ---------------------------------------------

  const reflection =
    await getReflectionForUser(
      userId,
      reflectionId
    );

  console.log(
    `Analyzing reflection ${reflectionId} for user ${userId}`
  );


  // ---------------------------------------------
  // 2. Get user's context
  // ---------------------------------------------

  const vision =
    await getUserVision(userId);

  const goals =
    await getUserGoals(userId);

  const actions =
    await getDailyActions(
    userId,
    reflection.reflectionDate
  );

  const dailyProgress =
     buildDailyProgress(actions);

  console.log(
    `Found ${goals.length} goals`
  );

  console.log(
    `Found ${actions.length} actions`
  );

  console.log(
    `Found ${dailyProgress.total} actions`
  );


  // ---------------------------------------------
  // 3. Analyze reflection using Qwen
  // ---------------------------------------------

  console.log(
    'Sending reflection analysis prompt to Qwen...'
  );

  const analysis =
    await analyzeReflection({
      reflection,
      vision,
      goals,
      actions,
      dailyProgress,
    });

  console.log(
    'Reflection AI analysis:',
    JSON.stringify(
      analysis,
      null,
      2
    )
  );


  // ---------------------------------------------
  // 4. Persist ReflectionAnalysis
  // ---------------------------------------------

  const existingAnalysis =
    await db.orm.public.ReflectionAnalysis.first({
      reflectionId,
      userId,
    });

  const analysisData = {
    userId,
    reflectionId,

    summary:
      analysis.summary || null,

    moodAnalysis:
      analysis.moodAnalysis || null,

    productivityAnalysis:
      analysis.productivityAnalysis || null,

    highlights:
      Array.isArray(analysis.highlights)
        ? JSON.stringify(analysis.highlights)
        : analysis.highlights || null,

    challenges:
      Array.isArray(analysis.challenges)
        ? JSON.stringify(analysis.challenges)
        : analysis.challenges || null,

    learnings:
      Array.isArray(analysis.learnings)
        ? JSON.stringify(analysis.learnings)
        : analysis.learnings || null,

    goalAlignment:
      Array.isArray(analysis.goalAlignment)
        ? JSON.stringify(analysis.goalAlignment)
        : analysis.goalAlignment || null,

    progressAnalysis:
      analysis.progressAnalysis
        ? JSON.stringify(
            analysis.progressAnalysis
            )
        : null,

    recommendedActions:
      Array.isArray(analysis.recommendedActions)
        ? JSON.stringify(
            analysis.recommendedActions
          )
        : analysis.recommendedActions || null,
  };


  let reflectionAnalysis;

  if (existingAnalysis) {

    reflectionAnalysis =
      await db.orm.public.ReflectionAnalysis
        .where({
          id: existingAnalysis.id,
          userId,
        })
        .update(analysisData);

  } else {

    reflectionAnalysis =
      await db.orm.public.ReflectionAnalysis.create(
        analysisData
      );
  }


  console.log(
    'Reflection analysis saved:',
    reflectionAnalysis
  );


  // ---------------------------------------------
  // 5. Create ActionSuggestions
  // ---------------------------------------------

  const suggestions =
    await createReflectionSuggestions(
      userId,
      reflectionId,
      analysis.recommendedActions
    );


  console.log(
    `Created ${suggestions.length} reflection action suggestions`
  );


  // ---------------------------------------------
  // 6. Return complete result
  // ---------------------------------------------

  return {
    analysis: reflectionAnalysis,
    suggestions,
  };
}