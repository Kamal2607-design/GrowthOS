import {
  assembleContext,
} from './context-assembly.service.js';

import {
  generateContextResponse,
} from './ai/context-response-ai.service.js';

export async function generateRagResponse(
  userId,
  query
) {
  if (!Number.isInteger(userId)) {
    throw new Error(
      'INVALID_USER_ID'
    );
  }

  if (
    !query ||
    typeof query !== 'string' ||
    !query.trim()
  ) {
    throw new Error(
      'RAG_QUERY_REQUIRED'
    );
  }

  const normalizedQuery =
    query.trim();

  /*
   * Step 1:
   * Assemble the user's relevant context.
   */
  const context =
    await assembleContext(
      userId,
      normalizedQuery
    );

  /*
   * Step 2:
   * Give that context to Qwen.
   */
  const answer =
    await generateContextResponse(
      context
    );

  return {
    query: normalizedQuery,

    answer,

    contextSummary: {
      memories: context.memories.length,
      goals: context.goals.length,
      actions: context.actions.length,
      reflections:
        context.reflections.length,
      hasVision:
        Boolean(context.vision),
    },
  };
}