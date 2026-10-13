import express from 'express';

import {
  authenticate,
} from '../middleware/auth.middleware.js';

import {
  getUserContext,
} from '../controllers/context-assembly.controller.js';

const router = express.Router();

router.post(
  '/',
  authenticate,
  getUserContext
);

export default router;