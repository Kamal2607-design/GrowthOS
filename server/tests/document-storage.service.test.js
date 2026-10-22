import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  getDocumentStorageRoot,
  matchesDeclaredDocumentType,
  removeStoredDocument,
  resolveStoredDocument,
  sanitizeUploadFileName,
  saveUploadedDocument,
} from '../src/services/document-storage.service.js';

const PDF_BYTES = Buffer.from('%PDF-1.7\n%test document\n');

let storageRoot;
let outsideDirectory;

test.before(async () => {
  storageRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), 'growthos-storage-test-'),
  );
  outsideDirectory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'growthos-outside-test-'),
  );

  process.env.DOCUMENT_STORAGE_DIR = storageRoot;
});

test.after(async () => {
  delete process.env.DOCUMENT_STORAGE_DIR;

  await fs.rm(storageRoot, { recursive: true, force: true });
  await fs.rm(outsideDirectory, { recursive: true, force: true });
});

test('uses the configured storage root', () => {
  assert.equal(getDocumentStorageRoot(), path.resolve(storageRoot));
});

test('saves uploads in the user directory under a generated name', async () => {
  const stored = await saveUploadedDocument(1, {
    buffer: PDF_BYTES,
    mimeType: 'application/pdf',
  });

  assert.match(
    stored.filePath,
    /^[0-9a-f-]{36}\.pdf$/,
  );
  assert.equal(stored.fileSize, PDF_BYTES.length);

  const written = await fs.readFile(
    path.join(storageRoot, '1', stored.filePath),
  );

  assert.deepEqual(written, PDF_BYTES);
});

test('resolves a stored document to an absolute path inside storage', async () => {
  const stored = await saveUploadedDocument(1, {
    buffer: PDF_BYTES,
    mimeType: 'application/pdf',
  });

  const resolved = await resolveStoredDocument(1, stored.filePath);

  assert.equal(path.isAbsolute(resolved.absolutePath), true);
  assert.equal(resolved.storedPath, stored.filePath);
  assert.deepEqual(
    await fs.readFile(resolved.absolutePath),
    PDF_BYTES,
  );
});

test('rejects an absolute path outside storage', async () => {
  const secret = path.join(outsideDirectory, '.env');
  await fs.writeFile(secret, 'JWT_SECRET=do-not-read');

  await assert.rejects(
    () => resolveStoredDocument(1, secret),
    { message: 'DOCUMENT_FILE_OUTSIDE_STORAGE' },
  );
});

test('rejects path traversal into another user directory', async () => {
  const otherUserFile = await saveUploadedDocument(2, {
    buffer: PDF_BYTES,
    mimeType: 'application/pdf',
  });

  await assert.rejects(
    () => resolveStoredDocument(1, `../2/${otherUserFile.filePath}`),
    { message: 'DOCUMENT_FILE_OUTSIDE_STORAGE' },
  );

  await assert.rejects(
    () =>
      resolveStoredDocument(
        1,
        path.join(storageRoot, '2', otherUserFile.filePath),
      ),
    { message: 'DOCUMENT_FILE_OUTSIDE_STORAGE' },
  );
});

test('rejects a symlink that points outside storage', async () => {
  const secret = path.join(outsideDirectory, 'secret.txt');
  await fs.writeFile(secret, 'private');

  await fs.mkdir(path.join(storageRoot, '1'), { recursive: true });
  await fs.symlink(secret, path.join(storageRoot, '1', 'link.txt'));

  await assert.rejects(
    () => resolveStoredDocument(1, 'link.txt'),
    { message: 'DOCUMENT_FILE_OUTSIDE_STORAGE' },
  );
});

test('rejects the storage directory itself and missing files', async () => {
  await assert.rejects(
    () => resolveStoredDocument(1, '.'),
    { message: 'DOCUMENT_FILE_OUTSIDE_STORAGE' },
  );

  await assert.rejects(
    () => resolveStoredDocument(1, 'does-not-exist.pdf'),
    { message: 'DOCUMENT_FILE_MISSING' },
  );

  await assert.rejects(
    () => resolveStoredDocument(1, '   '),
    { message: 'DOCUMENT_FILE_PATH_REQUIRED' },
  );
});

test('a stored name starting with "-" resolves to an absolute path', async () => {
  await fs.mkdir(path.join(storageRoot, '1'), { recursive: true });
  await fs.writeFile(path.join(storageRoot, '1', '-option.txt'), 'x');

  const resolved = await resolveStoredDocument(1, '-option.txt');

  assert.equal(resolved.absolutePath.startsWith('-'), false);
  assert.equal(path.isAbsolute(resolved.absolutePath), true);
});

test('removes stored documents but never files outside storage', async () => {
  const stored = await saveUploadedDocument(1, {
    buffer: PDF_BYTES,
    mimeType: 'application/pdf',
  });

  assert.equal(await removeStoredDocument(1, stored.filePath), true);
  await assert.rejects(
    () => fs.access(path.join(storageRoot, '1', stored.filePath)),
  );

  const outsideFile = path.join(outsideDirectory, 'keep.txt');
  await fs.writeFile(outsideFile, 'keep me');

  assert.equal(await removeStoredDocument(1, outsideFile), false);
  assert.equal(await fs.readFile(outsideFile, 'utf8'), 'keep me');
});

test('rejects an invalid user ID', async () => {
  await assert.rejects(
    () =>
      saveUploadedDocument(0, {
        buffer: PDF_BYTES,
        mimeType: 'application/pdf',
      }),
    { message: 'INVALID_USER_ID' },
  );
});

test('rejects unsupported types when saving', async () => {
  await assert.rejects(
    () =>
      saveUploadedDocument(1, {
        buffer: Buffer.from('PK'),
        mimeType: 'application/zip',
      }),
    { message: 'UNSUPPORTED_DOCUMENT_TYPE' },
  );
});

test('checks file content against the declared type', () => {
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00,
  ]);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

  assert.equal(matchesDeclaredDocumentType(PDF_BYTES, 'application/pdf'), true);
  assert.equal(matchesDeclaredDocumentType(png, 'image/png'), true);
  assert.equal(matchesDeclaredDocumentType(jpeg, 'image/jpeg'), true);
  assert.equal(
    matchesDeclaredDocumentType(Buffer.from('notes'), 'text/plain'),
    true,
  );

  assert.equal(
    matchesDeclaredDocumentType(Buffer.from('hello'), 'application/pdf'),
    false,
  );
  assert.equal(matchesDeclaredDocumentType(PDF_BYTES, 'image/png'), false);
  assert.equal(matchesDeclaredDocumentType(png, 'text/plain'), false);
  assert.equal(
    matchesDeclaredDocumentType(PDF_BYTES, 'application/zip'),
    false,
  );
});

test('sanitizes upload file names to a display name', () => {
  assert.equal(sanitizeUploadFileName('report.pdf'), 'report.pdf');
  assert.equal(
    sanitizeUploadFileName('My%20Report%202026.pdf'),
    'My Report 2026.pdf',
  );
  assert.equal(sanitizeUploadFileName('../../etc/passwd'), 'passwd');
  assert.equal(
    sanitizeUploadFileName('C:\\Users\\me\\notes.txt'),
    'notes.txt',
  );
  assert.equal(sanitizeUploadFileName('a\u0000b\nc.txt'), 'abc.txt');
  assert.equal(sanitizeUploadFileName('x'.repeat(300)).length, 255);

  assert.equal(sanitizeUploadFileName(''), null);
  assert.equal(sanitizeUploadFileName('..'), null);
  assert.equal(sanitizeUploadFileName(undefined), null);
});
