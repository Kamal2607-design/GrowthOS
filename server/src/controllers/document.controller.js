import {
  createDocument,
  getDocuments,
  getDocumentById,
  getDocumentText,
  deleteDocument,
  generateDocumentCandidates,
  getMemoryCandidates,
  acceptMemoryCandidate,
  rejectMemoryCandidate,
  getGoalCandidates,
  acceptGoalCandidate,
  rejectGoalCandidate,
  getActionCandidates,
  acceptActionCandidate,
  rejectActionCandidate,
} from '../services/document.service.js';

import {
  extractDocumentText,
} from '../services/document-extraction.service.js';

import {
  analyzeDocumentAndStore,
  getDocumentAnalysis
} from '../services/document-understanding.service.js';


export async function createCurrentUserDocument(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const {
      fileName,
      filePath,
      mimeType,
      fileSize,
    } = req.body ?? {};

    const document =
      await createDocument(
        userId,
        {
          fileName,
          filePath,
          mimeType,
          fileSize:
            fileSize === undefined ||
            fileSize === null
              ? fileSize
              : Number(fileSize),
        }
      );

    return res.status(201).json({
      success: true,
      message:
        'Document created successfully',
      document,
    });

  } catch (error) {
    console.error(
      'Create document error:',
      error
    );

    if (
      error.message ===
      'DOCUMENT_FILE_NAME_REQUIRED'
    ) {
      return res.status(400).json({
        success: false,
        message: 'File name is required',
      });
    }

    if (
      error.message ===
      'DOCUMENT_FILE_PATH_REQUIRED'
    ) {
      return res.status(400).json({
        success: false,
        message: 'File path is required',
      });
    }

    if (
      error.message ===
      'DOCUMENT_MIME_TYPE_REQUIRED'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Mime type is required',
      });
    }

    if (
      error.message ===
      'INVALID_DOCUMENT_FILE_SIZE'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file size',
      });
    }

    return res.status(500).json({
      success: false,
      message:
        'Failed to create document',
    });
  }
}


export async function getCurrentUserDocuments(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const documents =
      await getDocuments(userId);

    return res.status(200).json({
      success: true,
      documents,
    });

  } catch (error) {
    console.error(
      'Get documents error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch documents',
    });
  }
}


export async function getCurrentUserDocument(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const documentId =
      Number(req.params.id);

    if (!Number.isInteger(documentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document id',
      });
    }

    const document =
      await getDocumentById(
        userId,
        documentId
      );

    return res.status(200).json({
      success: true,
      document,
    });

  } catch (error) {
    console.error(
      'Get document error:',
      error
    );

    if (
      error.message ===
      'DOCUMENT_NOT_FOUND'
    ) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch document',
    });
  }
}


export async function getCurrentUserDocumentText(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const documentId =
      Number(req.params.id);

    if (!Number.isInteger(documentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document id',
      });
    }

    const document =
      await getDocumentText(
        userId,
        documentId
      );

    return res.status(200).json({
      success: true,
      document,
    });

  } catch (error) {
    console.error(
      'Get document text error:',
      error
    );

    if (
      error.message ===
      'DOCUMENT_NOT_FOUND'
    ) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    return res.status(500).json({
      success: false,
      message:
        'Failed to fetch document text',
    });
  }
}


export async function extractCurrentUserDocument(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const documentId =
      Number(req.params.id);

    if (!Number.isInteger(documentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document id',
      });
    }

    const document =
      await extractDocumentText(
        userId,
        documentId
      );

    return res.status(200).json({
      success: true,
      message:
        'Document text extracted successfully',
      document,
    });

  } catch (error) {
    console.error(
      'Extract document error:',
      error
    );

    if (
      error.message ===
      'DOCUMENT_NOT_FOUND'
    ) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    if (
      error.message ===
      'UNSUPPORTED_DOCUMENT_TYPE'
    )
    return res.status(400).json({
    success: false,
    message:
        'This document type is not supported yet',
    });

    return res.status(500).json({
      success: false,
      message:
        'Failed to extract document text',
    });
  }
}


export async function deleteCurrentUserDocument(
  req,
  res
) {
  try {
    const userId = req.user.id;

    const documentId =
      Number(req.params.id);

    if (!Number.isInteger(documentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document id',
      });
    }

    const document =
      await deleteDocument(
        userId,
        documentId
      );

    return res.status(200).json({
      success: true,
      message:
        'Document deleted successfully',
      document,
    });

  } catch (error) {
    console.error(
      'Delete document error:',
      error
    );

    if (
      error.message ===
      'DOCUMENT_NOT_FOUND'
    ) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    return res.status(500).json({
      success: false,
      message:
        'Failed to delete document',
    });
  }
}

export async function analyzeUserDocument(
  req,
  res
) {
  try {

    const userId =
      req.user.id;

    const documentId =
      Number(
        req.params.id
      );


    if (
      !Number.isInteger(
        documentId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Invalid document ID',
      });
    }


    const result =
      await analyzeDocumentAndStore(
        userId,
        documentId
      );


    return res.status(200).json({
      success: true,
      message:
        'Document analyzed successfully',

      document:
        result.document,

      analysis:
        result.analysis,
    });

  } catch (error) {

    console.error(
      'Document analysis error:',
      error
    );


    return res.status(500).json({
      success: false,
      message:
        error.message ||
        'Failed to analyze document',
    });
  }
}

export async function getUserDocumentAnalysis(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const documentId = Number(
      req.params.id
    );

    if (
      !Number.isInteger(documentId) ||
      documentId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document ID',
      });
    }

    const analysis =
      await getDocumentAnalysis(
        userId,
        documentId
      );

    return res.status(200).json({
      success: true,
      message:
        'Document analysis retrieved successfully',
      analysis,
    });

  } catch (error) {
    if (
      error.message ===
      'DOCUMENT_NOT_FOUND'
    ) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    if (
      error.message ===
      'DOCUMENT_ANALYSIS_NOT_FOUND'
    ) {
      return res.status(404).json({
        success: false,
        message:
          'Document has not been analyzed yet',
      });
    }

    if (
      error.message ===
      'DOCUMENT_ANALYSIS_INVALID'
    ) {
      return res.status(500).json({
        success: false,
        message:
          'Saved document analysis is invalid',
      });
    }

    console.error(
      'Get document analysis error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to retrieve document analysis',
    });
  }
}


export async function generateUserDocumentCandidates(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const documentId = Number(req.params.id);

    if (
      !Number.isInteger(documentId) ||
      documentId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document ID',
      });
    }

    const result = await generateDocumentCandidates(
      userId,
      documentId
    );

    return res.status(200).json({
      success: true,
      message: 'Document candidates generated successfully',
      ...result,
    });
  } catch (error) {
    if (error.message === 'DOCUMENT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    if (
      error.message === 'DOCUMENT_ANALYSIS_NOT_FOUND'
    ) {
      return res.status(404).json({
        success: false,
        message: 'Analyze the document before generating candidates',
      });
    }

    if (
      error.message === 'DOCUMENT_ANALYSIS_INVALID'
    ) {
      return res.status(500).json({
        success: false,
        message: 'Saved document analysis is invalid',
      });
    }

    console.error(
      'Generate document candidates error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Failed to generate document candidates',
    });
  }
}


export async function getUserMemoryCandidates(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const documentId = Number(req.params.id);

    if (
      !Number.isInteger(documentId) ||
      documentId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document ID',
      });
    }

    const status =
      typeof req.query.status === 'string'
        ? req.query.status
        : 'pending';

    const allowedStatuses = [
      'pending',
      'accepted',
      'rejected',
    ];

    if (
      status &&
      !allowedStatuses.includes(status)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate status',
      });
    }

    const candidates = await getMemoryCandidates(
      userId,
      documentId,
      status
    );

    return res.status(200).json({
      success: true,
      totalCandidates: candidates.length,
      candidates,
    });
  } catch (error) {
    if (error.message === 'DOCUMENT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    console.error('Get memory candidates error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve memory candidates',
    });
  }
}


export async function acceptUserMemoryCandidate(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const candidateId = Number(req.params.candidateId);

    if (
      !Number.isInteger(candidateId) ||
      candidateId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate ID',
      });
    }

    const result = await acceptMemoryCandidate(
      userId,
      candidateId
    );

    return res.status(200).json({
      success: true,
      message: result.alreadyAccepted
        ? 'Memory candidate was already accepted'
        : 'Memory candidate accepted successfully',
      ...result,
    });
  } catch (error) {
    if (error.message === 'MEMORY_CANDIDATE_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Memory candidate not found',
      });
    }

    if (
      error.message === 'MEMORY_CANDIDATE_ALREADY_REVIEWED'
    ) {
      return res.status(409).json({
        success: false,
        message: 'Memory candidate has already been reviewed',
      });
    }

    if (
      error.message === 'MEMORY_CANDIDATE_CONTENT_REQUIRED'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Candidate memory content is empty',
      });
    }

    console.error('Accept memory candidate error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to accept memory candidate',
    });
  }
}


export async function rejectUserMemoryCandidate(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const candidateId = Number(req.params.candidateId);

    if (
      !Number.isInteger(candidateId) ||
      candidateId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate ID',
      });
    }

    const result = await rejectMemoryCandidate(
      userId,
      candidateId
    );

    return res.status(200).json({
      success: true,
      message: 'Memory candidate rejected successfully',
      ...result,
    });
  } catch (error) {
    if (error.message === 'MEMORY_CANDIDATE_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Memory candidate not found',
      });
    }

    if (
      error.message === 'MEMORY_CANDIDATE_ALREADY_REVIEWED'
    ) {
      return res.status(409).json({
        success: false,
        message: 'Memory candidate has already been reviewed',
      });
    }

    console.error('Reject memory candidate error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to reject memory candidate',
    });
  }
}

export async function getUserGoalCandidates(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const documentId = Number(req.params.id);

    if (!Number.isInteger(documentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document ID',
      });
    }

    const status =
      req.query.status !== undefined
        ? req.query.status
        : 'pending';

    const candidates =
      await getGoalCandidates(
        userId,
        documentId,
        status
      );

    return res.status(200).json({
      success: true,
      candidates,
      total: candidates.length,
    });
  } catch (error) {
    console.error(
      'getUserGoalCandidates error:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function acceptUserGoalCandidate(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const candidateId =
      Number(req.params.candidateId);

    if (!Number.isInteger(candidateId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate ID',
      });
    }

    const result =
      await acceptGoalCandidate(
        userId,
        candidateId
      );

    return res.status(200).json({
      success: true,
      message: 'Goal candidate accepted',
      ...result,
    });
  } catch (error) {
    console.error(
      'acceptUserGoalCandidate error:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function rejectUserGoalCandidate(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const candidateId =
      Number(req.params.candidateId);

    if (!Number.isInteger(candidateId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate ID',
      });
    }

    const result =
      await rejectGoalCandidate(
        userId,
        candidateId
      );

    return res.status(200).json({
      success: true,
      message: 'Goal candidate rejected',
      ...result,
    });
  } catch (error) {
    console.error(
      'rejectUserGoalCandidate error:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function getUserActionCandidates(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const documentId = Number(req.params.id);

    if (!Number.isInteger(documentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document ID',
      });
    }

    const status =
      req.query.status !== undefined
        ? req.query.status
        : 'pending';

    const candidates =
      await getActionCandidates(
        userId,
        documentId,
        status
      );

    return res.status(200).json({
      success: true,
      candidates,
      total: candidates.length,
    });
  } catch (error) {
    console.error(
      'getUserActionCandidates error:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function acceptUserActionCandidate(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const candidateId =
      Number(req.params.candidateId);

    if (!Number.isInteger(candidateId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate ID',
      });
    }

    const result =
      await acceptActionCandidate(
        userId,
        candidateId
      );

    return res.status(200).json({
      success: true,
      message: 'Action candidate accepted',
      ...result,
    });
  } catch (error) {
    console.error(
      'acceptUserActionCandidate error:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

export async function rejectUserActionCandidate(
  req,
  res
) {
  try {
    const userId = req.user.id;
    const candidateId =
      Number(req.params.candidateId);

    if (!Number.isInteger(candidateId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid candidate ID',
      });
    }

    const result =
      await rejectActionCandidate(
        userId,
        candidateId
      );

    return res.status(200).json({
      success: true,
      message: 'Action candidate rejected',
      ...result,
    });
  } catch (error) {
    console.error(
      'rejectUserActionCandidate error:',
      error
    );

    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}