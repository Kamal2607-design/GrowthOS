import express from 'express';

import {
  createCurrentUserAction,
  getCurrentUserActions,
  getCurrentUserAction,
  updateCurrentUserAction,
  deleteCurrentUserAction,
} from '../controllers/action.controller.js';

import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.post('/', createCurrentUserAction);

router.get('/', getCurrentUserActions);

router.get('/:id', getCurrentUserAction);

router.patch('/:id', updateCurrentUserAction);

router.delete('/:id', deleteCurrentUserAction);

export default router;