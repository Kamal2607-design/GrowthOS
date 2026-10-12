import express from 'express';

import {
  authenticate,
} from '../middleware/auth.middleware.js';

import {
  generateActionPlanController,
} from '../controllers/action-planner.controller.js';

const router = express.Router();

router.post(
  '/',
  authenticate,
  generateActionPlanController
);

export default router;