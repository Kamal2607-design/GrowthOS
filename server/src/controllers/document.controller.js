import {
  createDocument,
  getDocuments,
  getDocumentById,
  getDocumentText,
  deleteDocument,
} from '../services/document.service.js';

import {
  extractDocumentText,
} from '../services/document-extraction.service.js';


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