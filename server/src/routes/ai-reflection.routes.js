import express from 'express';

import {
  analyzeUserReflection,
} from '../controllers/ai-reflection.controller.js';

import {
  authenticate,
} from '../middleware/auth.middleware.js';

const router = express.Router();

router.post(
  '/:id/analyze',
  authenticate,
  analyzeUserReflection
);

export default router;