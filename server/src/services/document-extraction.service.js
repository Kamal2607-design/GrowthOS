import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { PDFParse } from 'pdf-parse';

import { db } from '../prisma/db.ts';

import {
  getDocumentById,
} from './document.service.js';

const execFileAsync =
  promisify(execFile);


async function extractTextFile(
  filePath
) {
  return await fs.readFile(
    filePath,
    'utf8'
  );
}


async function extractPdfFile(
  filePath
) {
  const buffer =
    await fs.readFile(filePath);

  const parser =
    new PDFParse({
      data: buffer,
    });

  const result =
    await parser.getText();

  await parser.destroy();

  return result.text;
}


async function extractImageFile(
  filePath
) {
  const { stdout } =
    await execFileAsync(
      'tesseract',
      [
        filePath,
        'stdout',
        '-l',
        'eng',
      ],
      {
        maxBuffer:
          10 * 1024 * 1024,
      }
    );

  return stdout;
}


function getExtractor(
  mimeType
) {
  switch (mimeType) {

    case 'text/plain':
      return {
        extract: extractTextFile,
        method: 'txt',
      };

    case 'application/pdf':
      return {
        extract: extractPdfFile,
        method: 'pdf_text',
      };

    case 'image/png':
    case 'image/jpeg':
    case 'image/jpg':
      return {
        extract: extractImageFile,
        method: 'ocr',
      };

    default:
      throw new Error(
        'UNSUPPORTED_DOCUMENT_TYPE'
      );
  }
}


export async function extractDocumentText(
  userId,
  documentId
) {
  const document =
    await getDocumentById(
      userId,
      documentId
    );

  const extractor =
    getExtractor(
      document.mimeType
    );

  await db.orm.public.Document
    .where({
      id: document.id,
      userId,
    })
    .update({
      processingStatus:
        'processing',
    });

  try {

    const text =
      await extractor.extract(
        document.filePath
      );

    const updatedDocument =
      await db.orm.public.Document
        .where({
          id: document.id,
          userId,
        })
        .update({
          extractedText: text,

          extractionMethod:
            extractor.method,

          processingStatus:
            'completed',
        });

    return updatedDocument;

  } catch (error) {

    await db.orm.public.Document
      .where({
        id: document.id,
        userId,
      })
      .update({
        processingStatus:
          'failed',
      });

    throw error;
  }
}