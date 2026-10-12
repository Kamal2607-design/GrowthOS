import express from 'express';

import {
  authenticate,
} from '../middleware/auth.middleware.js';

import {
  generateRagAnswer,
} from '../controllers/rag.controller.js';

const router = express.Router();

router.post(
  '/',
  authenticate,
  generateRagAnswer
);

export default router;