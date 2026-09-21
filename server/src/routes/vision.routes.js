import express from 'express';

import {
  getCurrentVision,
  createCurrentVision,
  updateCurrentVision,
  deleteCurrentVision,
} from '../controllers/vision.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getCurrentVision);

router.post('/', createCurrentVision);

router.patch('/', updateCurrentVision);

router.delete('/', deleteCurrentVision);

export default router;