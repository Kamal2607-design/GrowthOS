/**
 * Plain-language messages for API error codes the UI can act on.
 */

const DUPLICATE =
  'Nothing new to suggest: the plan only repeated tasks you already have, so nothing was saved. Reviewing older suggestions helps.';

const GENERATION_MESSAGES = {
  DAILY_PLANNER_GOAL_IS_PLACEHOLDER:
    'The plan assigned a suggestion to a test goal, so it was rejected. Nothing was saved. Try again.',
  DAILY_PLANNER_GOAL_MISMATCH:
    'The plan put a suggestion under an unrelated goal, so it was rejected. Nothing was saved. Try again.',
  DAILY_PLANNER_UNSUPPORTED_REFLECTION_CLAIM:
    "The plan referred to a reflection you haven't written today, so it was rejected. Nothing was saved. Try again.",
  DAILY_PLANNER_GOAL_NOT_ACTIVE_IN_CONTEXT:
    'The plan referenced a goal that is not active, so it was rejected. Nothing was saved. Try again.',
  DAILY_PLANNER_GOAL_NOT_ACTIVE_OR_OWNED:
    'One of your goals changed while planning. Nothing was saved. Try again.',
  DUPLICATE_PENDING_SUGGESTION: DUPLICATE,
  DUPLICATE_EXISTING_ACTION: DUPLICATE,
  DUPLICATE_GENERATED_SUGGESTION: DUPLICATE,
  DAILY_PLANNER_AI_UNAVAILABLE:
    'The AI planner is offline. Start Ollama and try again. Your goals and actions still work.',
  DAILY_PLANNER_AI_TIMEOUT:
    'The AI took too long to answer, so nothing was saved. Try again in a moment.',
};

export function generationErrorMessage(error) {
  if (error?.code && GENERATION_MESSAGES[error.code]) {
    return GENERATION_MESSAGES[error.code];
  }

  if (error?.status === 422) {
    return "The AI's plan didn't pass validation. Nothing was saved. Try again.";
  }

  if (error?.status === 503) {
    return 'Planning is temporarily unavailable. Try again in a moment.';
  }

  return errorMessage(error);
}

export function errorMessage(error) {
  if (!error) {
    return '';
  }

  if (error.status === 0) {
    return error.message;
  }

  if (error.status >= 500) {
    return 'Something went wrong on the server. Try again.';
  }

  return error.message || 'Something went wrong. Try again.';
}
