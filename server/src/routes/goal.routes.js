import express from 'express';

import {
  createCurrentUserGoal,
  getCurrentUserGoals,
  getCurrentUserGoal,
  updateCurrentUserGoal,
  deleteCurrentUserGoal,
} from '../controllers/goal.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createCurrentUserGoal);

router.get('/', getCurrentUserGoals);

router.get('/:id', getCurrentUserGoal);

router.patch('/:id', updateCurrentUserGoal);

router.delete('/:id', deleteCurrentUserGoal);

export default router;