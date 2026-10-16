import express from 'express';

import {
  authenticate,
} from '../middleware/auth.middleware.js';

import {
  getTodayDailyGrowthContext,
  generateDailyGrowthSuggestionsController,
} from '../controllers/daily-growth-loop.controller.js';


const router = express.Router();


router.get(
  '/today',
  authenticate,
  getTodayDailyGrowthContext
);


router.post(
  '/generate',
  authenticate,
  generateDailyGrowthSuggestionsController
);


export default router;