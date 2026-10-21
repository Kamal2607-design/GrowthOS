import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

/**
 * Server-side storage for uploaded documents.
 *
 * Clients never choose where a document lives on disk. Uploads are written
 * to <storage root>/<userId>/<random name>, and every read resolves the
 * stored path (following symlinks) and confirms that it is still inside
 * that user's directory before the file is opened or handed to OCR tools.
 */

const SERVER_ROOT = fileURLToPath(new URL('../../', import.meta.url));

const DEFAULT_MAX_UPLOAD_MB = 20;

export const SUPPORTED_DOCUMENT_TYPES = {
  'text/plain': '.txt',
  'application/pdf': '.pdf',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
};

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function isJpeg(buffer) {
  return (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  );
}

const CONTENT_SIGNATURES = {
  'application/pdf': (buffer) =>
    buffer.subarray(0, 1024).includes('%PDF-'),
  'image/png': (buffer) =>
    buffer.subarray(0, 8).equals(PNG_SIGNATURE),
  'image/jpeg': isJpeg,
  'image/jpg': isJpeg,
  // Plain text must not contain NUL bytes (a binary file).
  'text/plain': (buffer) => !buffer.includes(0),
};

export function getDocumentStorageRoot() {
  return path.resolve(
    process.env.DOCUMENT_STORAGE_DIR ||
      path.join(SERVER_ROOT, 'storage', 'documents'),
  );
}

export function getMaxDocumentUploadBytes() {
  const megabytes = Number(process.env.DOCUMENT_MAX_UPLOAD_MB);

  return (
    (Number.isFinite(megabytes) && megabytes > 0
      ? megabytes
      : DEFAULT_MAX_UPLOAD_MB) *
    1024 *
    1024
  );
}

function getUserStorageDirectory(userId) {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error('INVALID_USER_ID');
  }

  return path.join(getDocumentStorageRoot(), String(userId));
}

function isInsideDirectory(directory, target) {
  const relative = path.relative(directory, target);

  return (
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

export function matchesDeclaredDocumentType(buffer, mimeType) {
  const matches = CONTENT_SIGNATURES[mimeType];

  return Boolean(matches) && Buffer.isBuffer(buffer) && matches(buffer);
}

/**
 * Returns a display-safe file name, or null when none is usable.
 * The name is metadata only; it never becomes part of a disk path.
 */
export function sanitizeUploadFileName(value) {
  if (typeof value !== 'string') {
    return null;
  }

  let decoded = value;

  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Not URL-encoded; use as-is.
  }

  const name = path.posix
    .basename(decoded.replace(/\\/g, '/'))
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 255);

  return name && name !== '.' && name !== '..' ? name : null;
}

/**
 * Writes an upload to the user's storage directory under a random name.
 * Returns the stored path relative to that directory.
 */
export async function saveUploadedDocument(userId, { buffer, mimeType }) {
  const extension = SUPPORTED_DOCUMENT_TYPES[mimeType];

  if (!extension) {
    throw new Error('UNSUPPORTED_DOCUMENT_TYPE');
  }

  const directory = getUserStorageDirectory(userId);

  await fs.mkdir(directory, { recursive: true, mode: 0o700 });

  const storedName = `${randomUUID()}${extension}`;

  await fs.writeFile(path.join(directory, storedName), buffer, {
    flag: 'wx',
    mode: 0o600,
  });

  return {
    filePath: storedName,
    fileSize: buffer.length,
  };
}

/**
 * Resolves a stored document path for reading.
 *
 * Relative paths are resolved against the user's storage directory.
 * Anything that resolves outside that directory (absolute paths, "../",
 * or a symlink pointing elsewhere) is rejected. The returned absolute
 * path never begins with "-", so it cannot be parsed as a CLI option.
 *
 * Returns { absolutePath, storedPath } where storedPath is relative to
 * the user's directory.
 */
export async function resolveStoredDocument(userId, filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    throw new Error('DOCUMENT_FILE_PATH_REQUIRED');
  }

  const directory = getUserStorageDirectory(userId);
  const candidate = path.resolve(directory, filePath.trim());

  // Lexical check first: legacy absolute paths are reported as outside
  // storage even when the user has no storage directory yet.
  if (!isInsideDirectory(directory, candidate)) {
    throw new Error('DOCUMENT_FILE_OUTSIDE_STORAGE');
  }

  let realDirectory;
  let realFile;

  try {
    realDirectory = await fs.realpath(directory);
    realFile = await fs.realpath(candidate);
  } catch {
    throw new Error('DOCUMENT_FILE_MISSING');
  }

  // Re-check after following symlinks.
  if (!isInsideDirectory(realDirectory, realFile)) {
    throw new Error('DOCUMENT_FILE_OUTSIDE_STORAGE');
  }

  const stats = await fs.stat(realFile);

  if (!stats.isFile()) {
    throw new Error('DOCUMENT_FILE_MISSING');
  }

  return {
    absolutePath: realFile,
    storedPath: path.relative(realDirectory, realFile),
  };
}

/**
 * Best-effort removal of a stored document. Files outside the user's
 * storage directory are never touched. Returns true when a file was
 * removed.
 */
export async function removeStoredDocument(userId, filePath) {
  try {
    const { absolutePath } = await resolveStoredDocument(userId, filePath);

    await fs.rm(absolutePath, { force: true });

    return true;
  } catch (error) {
    if (
      error.message !== 'DOCUMENT_FILE_OUTSIDE_STORAGE' &&
      error.message !== 'DOCUMENT_FILE_MISSING' &&
      error.message !== 'DOCUMENT_FILE_PATH_REQUIRED'
    ) {
      console.error('Stored document removal failed:', error.message);
    }

    return false;
  }
}
