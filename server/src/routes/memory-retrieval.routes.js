import express from 'express';

import {
  authenticate,
} from '../middleware/auth.middleware.js';

import {
  searchUserMemories,
} from '../controllers/memory-retrieval.controller.js';

const router = express.Router();

router.post(
  '/',
  authenticate,
  searchUserMemories
);

export default router;