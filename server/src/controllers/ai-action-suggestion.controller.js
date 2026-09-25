import {
  generateActionSuggestions,
} from '../services/ai/action-suggestion-ai.service.js';

import {
  createActionSuggestion,
} from '../services/action-suggestion.service.js';

import { db } from '../prisma/db.ts';

export async function generateSuggestionsForGoal(req, res) {
  try {
    const { goalId } = req.params;

    const userId = req.user.id;

    const parsedGoalId = Number(goalId);

    console.log(
      `Generating AI suggestions for user ${userId}, goal ${parsedGoalId}`
    );

    // --------------------------------------------------
    // 1. Validate goalId
    // --------------------------------------------------

    if (!Number.isInteger(parsedGoalId)) {
      return res.status(400).json({
        error: 'Invalid goal ID',
      });
    }

    // --------------------------------------------------
    // 2. Get the goal
    // --------------------------------------------------

    const goal = await db.orm.public.Goal
      .where((g) => g.id.eq(parsedGoalId))
      .where((g) => g.userId.eq(userId))
      .first();

    if (!goal) {
      return res.status(404).json({
        error: 'Goal not found',
      });
    }

    console.log(
      'Goal found:',
      JSON.stringify(goal, null, 2)
    );

    // --------------------------------------------------
    // 3. Get user's vision
    // --------------------------------------------------

    const vision = await db.orm.public.Vision
      .where((v) => v.userId.eq(userId))
      .first();

    console.log(
      'Vision found:',
      JSON.stringify(vision, null, 2)
    );

    // --------------------------------------------------
    // 4. Generate suggestions using Qwen
    // --------------------------------------------------

    const suggestions = await generateActionSuggestions({
      vision,
      goal,
    });

    console.log(
      'Suggestions returned from AI service:',
      JSON.stringify(suggestions, null, 2)
    );

    // --------------------------------------------------
    // 5. Save every suggestion
    // --------------------------------------------------

    const createdSuggestions = [];

    for (const suggestion of suggestions) {
      console.log(
        'Creating ActionSuggestion:',
        JSON.stringify(suggestion, null, 2)
      );

      const created = await createActionSuggestion(
        userId,
        {
          goalId: parsedGoalId,
          title: suggestion.title,
          description: suggestion.description,
          reasoning: suggestion.reasoning,
          priority: suggestion.priority,
          source: 'ai',
        }
      );

      createdSuggestions.push(created);
    }

    // --------------------------------------------------
    // 6. Return suggestions
    // --------------------------------------------------

    return res.status(201).json({
      success: true,
      message: 'Action suggestions generated successfully',
      suggestions: createdSuggestions,
    });

  } catch (error) {
    console.error(
      'Generate action suggestions error:',
      error
    );

    return res.status(500).json({
      error: 'Failed to generate action suggestions',
    });
  }
}