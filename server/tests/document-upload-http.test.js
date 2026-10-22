import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';

import jwt from 'jsonwebtoken';

/*
 * HTTP checks for the documents API. Every request here is rejected before
 * any database write, so the suite is safe to run against a machine whose
 * .env points at a real database. Environment is set before the app is
 * imported (dotenv never overrides existing variables).
 */
const TEST_SECRET = 'document-upload-test-secret';

const storageRoot = await fs.mkdtemp(
  path.join(os.tmpdir(), 'growthos-upload-test-'),
);

process.env.JWT_SECRET = TEST_SECRET;
process.env.DOCUMENT_STORAGE_DIR = storageRoot;
process.env.DOCUMENT_MAX_UPLOAD_MB = '1';

const { default: app } = await import('../src/app.js');

const server = app.listen(0);
await once(server, 'listening');

const baseUrl = `http://127.0.0.1:${server.address().port}`;

const authHeader = {
  Authorization: `Bearer ${jwt.sign({ sub: '1' }, TEST_SECRET)}`,
};

test.after(async () => {
  server.closeAllConnections();
  server.close();
  await fs.rm(storageRoot, { recursive: true, force: true });
});

function upload(body, headers = {}) {
  return fetch(`${baseUrl}/api/documents/upload`, {
    method: 'POST',
    headers: { ...authHeader, ...headers },
    body,
    signal: AbortSignal.timeout(10000),
  });
}

async function storedFiles() {
  try {
    return await fs.readdir(path.join(storageRoot, '1'));
  } catch {
    return [];
  }
}

test('upload requires authentication', async () => {
  const response = await fetch(`${baseUrl}/api/documents/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/pdf',
      'X-File-Name': 'report.pdf',
    },
    body: '%PDF-1.7',
    signal: AbortSignal.timeout(10000),
  });

  assert.equal(response.status, 401);
});

test('upload rejects an unsupported content type with 415', async () => {
  const response = await upload('PK\u0003\u0004', {
    'Content-Type': 'application/zip',
    'X-File-Name': 'archive.zip',
  });

  assert.equal(response.status, 415);
});

test('upload rejects a missing file name', async () => {
  const response = await upload('%PDF-1.7', {
    'Content-Type': 'application/pdf',
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).message, /X-File-Name/);
});

test('upload rejects an empty file', async () => {
  const response = await upload('', {
    'Content-Type': 'application/pdf',
    'X-File-Name': 'empty.pdf',
  });

  assert.equal(response.status, 400);
});

test('upload rejects content that does not match its type', async () => {
  const response = await upload('just some text', {
    'Content-Type': 'application/pdf',
    'X-File-Name': 'fake.pdf',
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await storedFiles(), []);
});

test('upload rejects files over the size limit with JSON 413', async () => {
  const response = await upload(
    Buffer.concat([
      Buffer.from('%PDF-1.7\n'),
      Buffer.alloc(1.5 * 1024 * 1024, 0x20),
    ]),
    {
      'Content-Type': 'application/pdf',
      'X-File-Name': 'large.pdf',
    },
  );

  assert.equal(response.status, 413);
  assert.match((await response.json()).message, /1 MB upload limit/);
  assert.deepEqual(await storedFiles(), []);
});

test('registering a document by an arbitrary server path is rejected', async () => {
  for (const filePath of ['/etc/hosts', '../../.env', '../2/x.pdf']) {
    const response = await fetch(`${baseUrl}/api/documents`, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: 'secrets.txt',
        filePath,
        mimeType: 'text/plain',
        fileSize: 1,
      }),
      signal: AbortSignal.timeout(10000),
    });

    assert.equal(response.status, 400, filePath);
    assert.match(
      (await response.json()).message,
      /POST \/api\/documents\/upload/,
    );
  }
});
