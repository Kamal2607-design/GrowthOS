import express from 'express';

import {
  getUserGoalProgress,
  analyzeUserGoalProgress,
} from '../controllers/goal-progress.controller.js';

import {
  authenticate,
} from '../middleware/auth.middleware.js';

const router =
  express.Router();

router.get(
  '/:id/progress',
  authenticate,
  getUserGoalProgress
);

router.post(
  '/:id/progress/analyze',
  authenticate,
  analyzeUserGoalProgress
);

export default router;