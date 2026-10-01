import { db } from '../prisma/db.ts';

import {
  getDocumentById,
} from './document.service.js';

import {
  analyzeDocument,
} from './ai/document-understanding-ai.service.js';


export async function analyzeDocumentAndStore(
  userId,
  documentId
) {
  const document =
    await getDocumentById(
      userId,
      documentId
    );


  if (
    document.processingStatus !==
    'completed'
  ) {
    throw new Error(
      'DOCUMENT_TEXT_NOT_READY'
    );
  }


  if (
    !document.extractedText ||
    !document.extractedText.trim()
  ) {
    throw new Error(
      'DOCUMENT_EXTRACTED_TEXT_EMPTY'
    );
  }


  await db.orm.public.Document
    .where({
      id: document.id,
      userId,
    })
    .update({
      processingStatus:
        'understanding',
    });


  try {

    const analysis =
      await analyzeDocument(
        document
      );


    const updatedDocument =
      await db.orm.public.Document
        .where({
          id: document.id,
          userId,
        })
        .update({
          summary:
            analysis.summary,

          structuredData:
            JSON.stringify(
              analysis
            ),

          processingStatus:
            'completed',
        });


    return {
      document:
        updatedDocument,

      analysis,
    };

  } catch (error) {

    /*
     * We don't currently have
     * a separate "understanding failed"
     * status in the schema.
     *
     * Keep the document available
     * while exposing the error.
     */
    await db.orm.public.Document
      .where({
        id: document.id,
        userId,
      })
      .update({
        processingStatus:
          'completed',
      });


    throw error;
  }
}

export async function getDocumentAnalysis(
  userId,
  documentId
) {
  const document =
    await getDocumentById(
      userId,
      documentId
    );

  if (!document.structuredData) {
    throw new Error(
      'DOCUMENT_ANALYSIS_NOT_FOUND'
    );
  }

  let analysis;

  try {
    analysis = JSON.parse(
      document.structuredData
    );
  } catch {
    throw new Error(
      'DOCUMENT_ANALYSIS_INVALID'
    );
  }

  return {
    id: document.id,
    fileName: document.fileName,
    processingStatus:
      document.processingStatus,
    extractionMethod:
      document.extractionMethod,
    summary: document.summary,
    analysis,
  };
}