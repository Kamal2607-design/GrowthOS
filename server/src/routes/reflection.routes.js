import express from 'express';

import {
  createUserReflection,
  getUserReflections,
  getUserReflectionById,
  updateUserReflection,
  deleteUserReflection,
} from '../controllers/reflection.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post(
  '/',
  authenticate,
  createUserReflection
);

router.get(
  '/',
  authenticate,
  getUserReflections
);

router.get(
  '/:id',
  authenticate,
  getUserReflectionById
);

router.patch(
  '/:id',
  authenticate,
  updateUserReflection
);

router.delete(
  '/:id',
  authenticate,
  deleteUserReflection
);

export default router;