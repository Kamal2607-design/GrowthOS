/**
 * Single source of truth for the authentication cookie.
 *
 * Password login, the Google OAuth callback, logout, and the auth
 * middleware must all agree on the cookie name and attributes; otherwise
 * a cookie set by one flow is never read (or cleared) by another.
 *
 * Values are read at call time so dotenv has always been loaded.
 */

const DEFAULT_AUTH_COOKIE_NAME = 'growthos_token';

export const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function getAuthCookieName() {
  return process.env.JWT_COOKIE_NAME || DEFAULT_AUTH_COOKIE_NAME;
}

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.JWT_COOKIE_SECURE === 'true',
    sameSite: process.env.JWT_COOKIE_SAME_SITE || 'lax',
    path: '/',
  };
}

export function setAuthCookie(res, token) {
  res.cookie(getAuthCookieName(), token, {
    ...getAuthCookieOptions(),
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(getAuthCookieName(), getAuthCookieOptions());
}
