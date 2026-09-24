import express from 'express';

import {
  createCurrentUserActionSuggestion,
  getCurrentUserActionSuggestions,
  getCurrentUserActionSuggestion,
  acceptCurrentUserActionSuggestion,
  rejectCurrentUserActionSuggestion,
} from '../controllers/action-suggestion.controller.js';
import { generateSuggestionsForGoal } from '../controllers/ai-action-suggestion.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  createCurrentUserActionSuggestion
);

router.get(
  '/',
  getCurrentUserActionSuggestions
);

router.get(
  '/:id',
  getCurrentUserActionSuggestion
);

router.post(
  '/:id/accept',
  acceptCurrentUserActionSuggestion
);

router.post(
  '/:id/reject',
  rejectCurrentUserActionSuggestion
);

router.post(
  "/goals/:goalId/generate",
  generateSuggestionsForGoal
);

export default router;