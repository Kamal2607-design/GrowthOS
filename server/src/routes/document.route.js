import express from 'express';

import {
  createCurrentUserDocument,
  getCurrentUserDocuments,
  getCurrentUserDocument,
  getCurrentUserDocumentText,
  extractCurrentUserDocument,
  deleteCurrentUserDocument,
} from '../controllers/document.controller.js';

import {
  authenticate,
} from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  createCurrentUserDocument
);

router.get(
  '/',
  getCurrentUserDocuments
);

router.get(
  '/:id',
  getCurrentUserDocument
);

router.get(
  '/:id/text',
  getCurrentUserDocumentText
);

router.post(
  '/:id/extract',
  extractCurrentUserDocument
);

router.delete(
  '/:id',
  deleteCurrentUserDocument
);

export default router;