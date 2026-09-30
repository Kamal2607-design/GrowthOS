import { db } from '../prisma/db.ts';

export async function createDocument(
  userId,
  {
    fileName,
    filePath,
    mimeType,
    fileSize,
  }
) {
  if (!fileName || !fileName.trim()) {
    throw new Error('DOCUMENT_FILE_NAME_REQUIRED');
  }

  if (!filePath || !filePath.trim()) {
    throw new Error('DOCUMENT_FILE_PATH_REQUIRED');
  }

  if (!mimeType || !mimeType.trim()) {
    throw new Error('DOCUMENT_MIME_TYPE_REQUIRED');
  }

  if (
    fileSize === undefined ||
    fileSize === null ||
    !Number.isInteger(fileSize) ||
    fileSize < 0
  ) {
    throw new Error('INVALID_DOCUMENT_FILE_SIZE');
  }

  const document =
    await db.orm.public.Document.create({
      userId,

      fileName: fileName.trim(),
      filePath: filePath.trim(),
      mimeType: mimeType.trim(),
      fileSize,

      processingStatus: 'pending',

      extractedText: null,
      extractionMethod: null,
      summary: null,
      structuredData: null,
    });

  return document;
}


export async function getDocuments(userId) {
  return await db.orm.public.Document
    .where({
      userId,
    })
    .all();
}


export async function getDocumentById(
  userId,
  documentId
) {
  const document =
    await db.orm.public.Document.first({
      id: documentId,
      userId,
    });

  if (!document) {
    throw new Error('DOCUMENT_NOT_FOUND');
  }

  return document;
}


export async function getDocumentText(
  userId,
  documentId
) {
  const document =
    await getDocumentById(
      userId,
      documentId
    );

  return {
    id: document.id,
    fileName: document.fileName,
    processingStatus:
      document.processingStatus,
    extractionMethod:
      document.extractionMethod,
    extractedText:
      document.extractedText,
  };
}


export async function deleteDocument(
  userId,
  documentId
) {
  const document =
    await getDocumentById(
      userId,
      documentId
    );

  await db.orm.public.Document
    .where({
      id: document.id,
      userId,
    })
    .delete();

  return document;
}