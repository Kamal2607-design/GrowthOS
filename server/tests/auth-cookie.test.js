import test from 'node:test';
import assert from 'node:assert/strict';

import jwt from 'jsonwebtoken';

import {
  AUTH_COOKIE_MAX_AGE_MS,
  clearAuthCookie,
  getAuthCookieName,
  getAuthCookieOptions,
  setAuthCookie,
} from '../src/config/auth-cookie.js';

import {
  authenticate,
} from '../src/middleware/auth.middleware.js';

import {
  logout,
} from '../src/controllers/auth.controller.js';

const TEST_SECRET = 'auth-cookie-test-secret';

function withEnv(overrides, run) {
  const previous = {};

  for (const [key, value] of Object.entries(overrides)) {
    previous[key] = process.env[key];

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    return run();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

function createResponse() {
  const calls = {
    cookie: [],
    clearCookie: [],
    status: null,
    body: null,
  };

  return {
    calls,
    cookie(name, value, options) {
      calls.cookie.push({ name, value, options });
      return this;
    },
    clearCookie(name, options) {
      calls.clearCookie.push({ name, options });
      return this;
    },
    status(code) {
      calls.status = code;
      return this;
    },
    json(body) {
      calls.body = body;
      return this;
    },
  };
}

function runAuthenticate(req) {
  const res = createResponse();
  let nextCalled = false;

  authenticate(req, res, () => {
    nextCalled = true;
  });

  return { res, nextCalled };
}

test('uses growthos_token as the default cookie name', () => {
  withEnv({ JWT_COOKIE_NAME: undefined }, () => {
    assert.equal(getAuthCookieName(), 'growthos_token');
  });
});

test('honours JWT_COOKIE_NAME when set', () => {
  withEnv({ JWT_COOKIE_NAME: 'custom_cookie' }, () => {
    assert.equal(getAuthCookieName(), 'custom_cookie');
  });
});

test('sets and clears the same cookie with matching attributes', () => {
  withEnv({ JWT_COOKIE_NAME: undefined }, () => {
    const res = createResponse();

    setAuthCookie(res, 'token-value');
    clearAuthCookie(res);

    const [set] = res.calls.cookie;
    const [cleared] = res.calls.clearCookie;

    assert.equal(set.name, 'growthos_token');
    assert.equal(set.value, 'token-value');
    assert.equal(set.options.maxAge, AUTH_COOKIE_MAX_AGE_MS);
    assert.equal(set.options.httpOnly, true);

    assert.equal(cleared.name, set.name);
    assert.deepEqual(cleared.options, getAuthCookieOptions());
    assert.equal(cleared.options.path, set.options.path);
    assert.equal(cleared.options.sameSite, set.options.sameSite);
  });
});

test('logout clears the cookie that login sets', async () => {
  await withEnv({ JWT_COOKIE_NAME: undefined }, async () => {
    const res = createResponse();

    await logout({}, res);

    assert.equal(res.calls.status, 200);
    assert.deepEqual(
      res.calls.clearCookie.map((call) => call.name),
      ['growthos_token'],
    );
  });
});

test('middleware authenticates with the cookie the auth flows set', () => {
  withEnv(
    { JWT_COOKIE_NAME: undefined, JWT_SECRET: TEST_SECRET },
    () => {
      const token = jwt.sign(
        { sub: '7', email: 'user@example.com' },
        TEST_SECRET,
      );

      const req = {
        headers: {},
        cookies: { growthos_token: token },
      };

      const { nextCalled } = runAuthenticate(req);

      assert.equal(nextCalled, true);
      assert.deepEqual(req.user, { id: 7, email: 'user@example.com' });
    },
  );
});

test('middleware no longer reads the old misspelled cookie name', () => {
  withEnv(
    { JWT_COOKIE_NAME: undefined, JWT_SECRET: TEST_SECRET },
    () => {
      const token = jwt.sign({ sub: '7' }, TEST_SECRET);

      const { res, nextCalled } = runAuthenticate({
        headers: {},
        cookies: { growthos_tokennn: token },
      });

      assert.equal(nextCalled, false);
      assert.equal(res.calls.status, 401);
    },
  );
});

test('middleware still accepts a Bearer token', () => {
  withEnv({ JWT_SECRET: TEST_SECRET }, () => {
    const token = jwt.sign({ sub: '9' }, TEST_SECRET);

    const req = {
      headers: { authorization: `Bearer ${token}` },
      cookies: {},
    };

    const { nextCalled } = runAuthenticate(req);

    assert.equal(nextCalled, true);
    assert.equal(req.user.id, 9);
  });
});
