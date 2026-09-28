import { db } from '../prisma/db.ts';

import {
  analyzeReflection,
} from './ai/reflection-analysis-ai.service.js';

import {
  createActionSuggestion,
} from './action-suggestion.service.js';


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


async function getUserActions(userId) {
  return await db.orm.public.Action
    .where({
      userId,
    })
    .all();
}


async function createReflectionSuggestions(
  userId,
  reflectionId,
  recommendedActions
) {
  if (
    !Array.isArray(recommendedActions) ||
    recommendedActions.length === 0
  ) {
    return [];
  }

  const createdSuggestions = [];

  for (const recommendation of recommendedActions) {
    if (
      !recommendation ||
      !recommendation.title ||
      !recommendation.title.trim()
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
        }
      );

    createdSuggestions.push(suggestion);
  }

  return createdSuggestions;
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
    await getUserActions(userId);

  console.log(
    `Found ${goals.length} goals`
  );

  console.log(
    `Found ${actions.length} actions`
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