import express from 'express';

import {
  createCurrentUserDocument,
  getCurrentUserDocuments,
  getCurrentUserDocument,
  getCurrentUserDocumentText,
  extractCurrentUserDocument,
  deleteCurrentUserDocument,
  analyzeUserDocument,
  getUserDocumentAnalysis,
  generateUserDocumentCandidates,
  getUserMemoryCandidates,
  acceptUserMemoryCandidate,
  rejectUserMemoryCandidate,
  getUserGoalCandidates,
  acceptUserGoalCandidate,
  rejectUserGoalCandidate,
  getUserActionCandidates,
  acceptUserActionCandidate,
  rejectUserActionCandidate,  
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

router.post(
  '/:id/analyze',
  analyzeUserDocument
);

router.get(
  '/:id/analysis',
  getUserDocumentAnalysis
)

router.post(
  '/:id/candidates',
  generateUserDocumentCandidates
);

router.get(
  '/:id/candidates/memories',
  getUserMemoryCandidates
);

router.post(
  '/candidates/:candidateId/accept',
  acceptUserMemoryCandidate
);

router.post(
  '/candidates/:candidateId/reject',
  rejectUserMemoryCandidate
);

router.get(
  '/:id/candidates/goals',
  getUserGoalCandidates
);

router.post(
  '/candidates/:candidateId/accept-goal',
  acceptUserGoalCandidate
);

router.post(
  '/candidates/:candidateId/reject-goal',
  rejectUserGoalCandidate
);

router.get(
  '/:id/candidates/actions',
  getUserActionCandidates
);

router.post(
  '/candidates/:candidateId/accept-action',
  acceptUserActionCandidate
);

router.post(
  '/candidates/:candidateId/reject-action',
  rejectUserActionCandidate
);

export default router;