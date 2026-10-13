import express from 'express';

import {
  generateUserMemoryEmbedding,
} from '../controllers/memory-embedding.controller.js';

import {
  authenticate,
} from '../middleware/auth.middleware.js';

const router =
  express.Router();

router.post(
  '/memories/:id/embed',
  authenticate,
  generateUserMemoryEmbedding
);

export default router;