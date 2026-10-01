import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { PDFParse } from 'pdf-parse';

import { db } from '../prisma/db.ts';

import {
  getDocumentById,
} from './document.service.js';


const execFileAsync =
  promisify(execFile);


/*
|--------------------------------------------------------------------------
| TXT extraction
|--------------------------------------------------------------------------
*/

async function extractTextFile(
  filePath
) {
  const text =
    await fs.readFile(
      filePath,
      'utf8'
    );

  return {
    text,
    method: 'txt',
  };
}


/*
|--------------------------------------------------------------------------
| Tesseract OCR
|--------------------------------------------------------------------------
*/

async function extractTextWithTesseract(
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

  return stdout.trim();
}


/*
|--------------------------------------------------------------------------
| Image OCR
|--------------------------------------------------------------------------
*/

async function extractImageFile(
  filePath
) {
  const text =
    await extractTextWithTesseract(
      filePath
    );

  return {
    text,
    method: 'ocr',
  };
}


/*
|--------------------------------------------------------------------------
| Render scanned PDF pages
|--------------------------------------------------------------------------
*/

async function renderPdfToImages(
  filePath,
  outputDirectory
) {
  const outputPrefix =
    path.join(
      outputDirectory,
      'page'
    );

  await execFileAsync(
    'pdftoppm',
    [
      '-png',

      // 200 DPI gives a good
      // OCR/CPU balance.
      '-r',
      '200',

      filePath,

      outputPrefix,
    ],
    {
      maxBuffer:
        10 * 1024 * 1024,
    }
  );

  const files =
    await fs.readdir(
      outputDirectory
    );

  const imageFiles =
    files
      .filter(
        (file) =>
          file.toLowerCase().endsWith(
            '.png'
          )
      )
      .sort(
        (a, b) =>
          a.localeCompare(
            b,
            undefined,
            {
              numeric: true,
            }
          )
      );

  return imageFiles.map(
    (file) =>
      path.join(
        outputDirectory,
        file
      )
  );
}


/*
|--------------------------------------------------------------------------
| Scanned PDF OCR
|--------------------------------------------------------------------------
*/

async function extractScannedPdfFile(
  filePath
) {
  const temporaryDirectory =
    await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        'growthos-pdf-'
      )
    );

  try {

    /*
     * Convert every PDF page
     * into a PNG image.
     */
    const imageFiles =
      await renderPdfToImages(
        filePath,
        temporaryDirectory
      );

    if (
      imageFiles.length === 0
    ) {
      throw new Error(
        'PDF_RENDERING_PRODUCED_NO_IMAGES'
      );
    }


    /*
     * OCR pages sequentially.
     *
     * We intentionally process
     * one page at a time because
     * the current machine is
     * CPU-first.
     */
    const pageTexts = [];

    for (
      let index = 0;
      index < imageFiles.length;
      index++
    ) {

      const imageFile =
        imageFiles[index];

      const pageText =
        await extractTextWithTesseract(
          imageFile
        );

      pageTexts.push(
        `--- Page ${index + 1} ---\n${pageText}`
      );
    }


    const text =
      pageTexts.join(
        '\n\n'
      );

    return {
      text,
      method: 'pdf_ocr',
    };

  } finally {

    /*
     * Remove temporary
     * rendered page images.
     */
    await fs.rm(
      temporaryDirectory,
      {
        recursive: true,
        force: true,
      }
    );
  }
}


/*
|--------------------------------------------------------------------------
| Normal PDF extraction
|--------------------------------------------------------------------------
*/
function hasMeaningfulPdfText(
  text
) {
  if (!text) {
    return false;
  }

  /*
   * Remove common pdf-parse page
   * separator artifacts.
   *
   * Example:
   * -- 1 of 3 --
   * -- 2 of 3 --
   */
  const cleanedText =
    text
      .replace(
        /--\s*\d+\s+of\s+\d+\s*--/gi,
        ''
      )
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  /*
   * Count actual letters/numbers.
   *
   * This prevents strings such as
   * page separators from being
   * considered useful text.
   */
  const meaningfulCharacters =
    cleanedText.match(
      /[a-zA-Z0-9]/g
    ) || [];

  return (
    meaningfulCharacters.length >= 20
  );
}

async function extractPdfFile(
  filePath
) {
  const buffer =
    await fs.readFile(
      filePath
    );

  const parser =
    new PDFParse({
      data: buffer,
    });

  let text = '';

  try {

    const result =
      await parser.getText();

    text =
      result.text?.trim() || '';

  } finally {

    await parser.destroy();
  }


  /*
   * Check whether pdf-parse
   * actually extracted meaningful
   * document text.
   */
  if (
    hasMeaningfulPdfText(text)
  ) {
    return {
      text,
      method: 'pdf_text',
    };
  }


  /*
   * No meaningful text was found.
   *
   * Treat the PDF as scanned/image-based
   * and run OCR.
   */
  return await extractScannedPdfFile(
    filePath
  );
}


/*
|--------------------------------------------------------------------------
| Extractor selection
|--------------------------------------------------------------------------
*/

function getExtractor(
  mimeType
) {
  switch (mimeType) {

    case 'text/plain':
      return extractTextFile;


    case 'application/pdf':
      return extractPdfFile;


    case 'image/png':
    case 'image/jpeg':
    case 'image/jpg':
      return extractImageFile;


    default:
      throw new Error(
        'UNSUPPORTED_DOCUMENT_TYPE'
      );
  }
}


/*
|--------------------------------------------------------------------------
| Main document extraction
|--------------------------------------------------------------------------
*/

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

    const result =
      await extractor(
        document.filePath
      );


    const updatedDocument =
      await db.orm.public.Document
        .where({
          id: document.id,
          userId,
        })
        .update({
          extractedText:
            result.text,

          extractionMethod:
            result.method,

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