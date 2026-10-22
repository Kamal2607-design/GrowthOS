import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

import jwt from 'jsonwebtoken';

/*
 * HTTP-level checks against the real Express app. None of these requests
 * reach the database: each one is answered by CORS, authentication, or
 * request validation before any query runs.
 *
 * Environment is set before the app is imported so a local .env cannot
 * change the outcome (dotenv never overrides existing variables).
 */
const TEST_SECRET = 'api-http-test-secret';
const ALLOWED_ORIGIN = 'http://localhost:5173';

process.env.JWT_SECRET = TEST_SECRET;
process.env.CLIENT_ORIGIN = `${ALLOWED_ORIGIN}, http://127.0.0.1:5173`;
process.env.JWT_COOKIE_NAME = '';

const { default: app } = await import('../src/app.js');

const server = app.listen(0);
await once(server, 'listening');

const baseUrl = `http://127.0.0.1:${server.address().port}`;

const authToken = jwt.sign(
  { sub: '1', email: 'user@example.com' },
  TEST_SECRET,
);

test.after(() => {
  server.closeAllConnections();
  server.close();
});

function request(path, { method = 'GET', headers = {} } = {}) {
  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    signal: AbortSignal.timeout(5000),
  });
}

test('CORS allows the configured client origin with credentials', async () => {
  const response = await request('/api/health', {
    method: 'OPTIONS',
    headers: {
      Origin: ALLOWED_ORIGIN,
      'Access-Control-Request-Method': 'POST',
    },
  });

  assert.equal(
    response.headers.get('access-control-allow-origin'),
    ALLOWED_ORIGIN,
  );
  assert.equal(
    response.headers.get('access-control-allow-credentials'),
    'true',
  );
});

test('CORS accepts every origin in the comma-separated list', async () => {
  const response = await request('/api/health', {
    headers: { Origin: 'http://127.0.0.1:5173' },
  });

  assert.equal(
    response.headers.get('access-control-allow-origin'),
    'http://127.0.0.1:5173',
  );
});

test('CORS does not allow an unlisted origin', async () => {
  const response = await request('/api/health', {
    headers: { Origin: 'http://evil.example' },
  });

  assert.equal(
    response.headers.get('access-control-allow-origin'),
    null,
  );
});

test('requests without an Origin header still work', async () => {
  const response = await request('/api/health');

  assert.equal(response.status, 200);
});

test('a protected route accepts the growthos_token cookie', async () => {
  // Body-less POST: authentication must pass (not 401), and
  // validation then answers 400 without touching the database.
  const response = await request('/api/vision', {
    method: 'POST',
    headers: { Cookie: `growthos_token=${authToken}` },
  });

  assert.equal(response.status, 400);
});

test('a protected route rejects the old misspelled cookie', async () => {
  const response = await request('/api/vision', {
    method: 'POST',
    headers: { Cookie: `growthos_tokennn=${authToken}` },
  });

  assert.equal(response.status, 401);
});

const BODYLESS_REQUESTS = [
  ['POST', '/api/auth/register', false],
  ['POST', '/api/auth/login', false],
  ['POST', '/api/vision', true],
  ['PATCH', '/api/vision', true],
  ['POST', '/api/goals', true],
  ['PATCH', '/api/goals/1', true],
  ['POST', '/api/actions', true],
  ['PATCH', '/api/actions/1/status', true],
  ['POST', '/api/action-planner', true],
  ['POST', '/api/memories', true],
  ['POST', '/api/memories/search', true],
  ['POST', '/api/context', true],
  ['POST', '/api/rag', true],
];

for (const [method, path, authenticated] of BODYLESS_REQUESTS) {
  test(`${method} ${path} without a body returns 400, not 500`, async () => {
    const response = await request(path, {
      method,
      headers: authenticated
        ? { Authorization: `Bearer ${authToken}` }
        : {},
    });

    assert.equal(response.status, 400);
  });
}

test('Google callback failure returns JSON when no client app is configured', async () => {
  delete process.env.CLIENT_APP_URL;

  const response = await request('/api/auth/google/callback');

  assert.equal(response.status, 400);
  assert.equal((await response.json()).success, false);
});

test('Google callback failure redirects to the client app when configured', async () => {
  process.env.CLIENT_APP_URL = 'http://localhost:5173/';

  try {
    const response = await fetch(`${baseUrl}/api/auth/google/callback`, {
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    });

    assert.equal(response.status, 302);
    assert.equal(
      response.headers.get('location'),
      'http://localhost:5173/sign-in?error=google',
    );
  } finally {
    delete process.env.CLIENT_APP_URL;
  }
});
