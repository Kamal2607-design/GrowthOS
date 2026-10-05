import express from 'express';

import {
  createUserMemory,
  getUserMemories,
  getUserMemoryById,
  updateUserMemory,
  archiveUserMemory,
  deleteUserMemory,
  normalizeUserMemory,
  normalizePendingUserMemories,
} from '../controllers/memory.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post(
  '/',
  authenticate,
  createUserMemory
);

router.get(
  '/',
  authenticate,
  getUserMemories
);

router.get(
  '/:id',
  authenticate,
  getUserMemoryById
);

router.patch(
  '/:id',
  authenticate,
  updateUserMemory
);

router.patch(
  '/:id/archive',
  authenticate,
  archiveUserMemory
);

router.delete(
  '/:id',
  authenticate,
  deleteUserMemory
);

router.post(
  '/:id/normalize',
  authenticate,
  normalizeUserMemory
);

router.post(
  '/normalize-pending',
  authenticate,
  normalizePendingUserMemories
);

export default router;