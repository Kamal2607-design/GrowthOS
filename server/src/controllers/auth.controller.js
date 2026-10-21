import {
  registerUser,
  loginUser,
  createAuthToken,
  loginOrCreateGoogleUser,
} from '../services/auth.service.js';

import {
  handleGoogleCallback,
} from '../services/google-oauth.service.js';
import {db} from '../prisma/db.ts';
import {
  setAuthCookie,
  clearAuthCookie,
} from '../config/auth-cookie.js';

export async function register(req, res) {
  try {
    const { email, password, name, username } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters',
      });
    }

    const user = await registerUser({
      email,
      password,
      name,
      username,
    });

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user,
    });
  } catch (error) {
    if (error.message === 'EMAIL_ALREADY_EXISTS') {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    console.error('Registration error:', error);

    return res.status(500).json({
      success: false,
      message: 'Something went wrong while creating the account',
    });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const result = await loginUser({
      email,
      password,
    });
    setAuthCookie(res, result.token);
    return res.status(200).json({
      success: true,
      message: 'Login successful',
    //   token: result.token,
      user: result.user,
    });
  } catch (error) {
    if (error.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (error.message === 'OAUTH_ACCOUNT') {
      return res.status(400).json({
        success: false,
        message: 'This account uses social login',
      });
    }

    console.error('Login error:', error);

    return res.status(500).json({
      success: false,
      message: 'Something went wrong while logging in',
    });
  }
}

export async function getCurrentUser(req, res) {
  try {
    const user = await db.orm.public.User.first({
      id: req.user.id,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
    });
  }
}

export async function logout(req, res) {
  try {
    clearAuthCookie(res);

    return res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);

    return res.status(500).json({
      success: false,
      message: 'Something went wrong while logging out',
    });
  }
}

// When CLIENT_APP_URL is set (the browser app), Google sign-in sends the
// user back to it instead of returning JSON.
function getClientAppUrl() {
  return process.env.CLIENT_APP_URL?.trim().replace(/\/+$/, '') || null;
}

function googleAuthFailed(res, status, message) {
  const clientAppUrl = getClientAppUrl();

  if (clientAppUrl) {
    return res.redirect(`${clientAppUrl}/sign-in?error=google`);
  }

  return res.status(status).json({
    success: false,
    message,
  });
}

export async function googleCallback(req, res) {
  try {
    const state = req.cookies.google_oauth_state;
    const nonce = req.cookies.google_oauth_nonce;
    const codeVerifier =
      req.cookies.google_oauth_code_verifier;

    if (!state || !nonce || !codeVerifier) {
      return googleAuthFailed(res, 400, 'Google OAuth session expired or is invalid');
    }

    const callbackUrl = new URL(
      `${req.protocol}://${req.get('host')}${req.originalUrl}`
    );

    const { claims } = await handleGoogleCallback({
      callbackUrl,
      state,
      nonce,
      codeVerifier,
    });

    if (!claims) {
      return googleAuthFailed(res, 400, 'Unable to retrieve Google account information');
    }

    const googleUser = {
      providerAccountId: claims.sub,
      email: claims.email,
      name: claims.name,
      emailVerified: claims.email_verified,
    };

    if (!googleUser.providerAccountId) {
      return googleAuthFailed(res, 400, 'Google account ID was not provided');
    }

    if (!googleUser.email) {
      return googleAuthFailed(res, 400, 'Google account email was not provided');
    }

    if (googleUser.emailVerified !== true) {
      return googleAuthFailed(res, 400, 'Google email is not verified');
    }

    const user = await loginOrCreateGoogleUser({
      providerAccountId: googleUser.providerAccountId,
      email: googleUser.email,
      name: googleUser.name,
    });

    const token = createAuthToken(user);

    setAuthCookie(res, token);

    // OAuth transaction cookies are no longer needed.
    res.clearCookie('google_oauth_state', {
      path: '/api/auth/google',
    });

    res.clearCookie('google_oauth_nonce', {
      path: '/api/auth/google',
    });

    res.clearCookie('google_oauth_code_verifier', {
      path: '/api/auth/google',
    });

    const clientAppUrl = getClientAppUrl();

    if (clientAppUrl) {
      return res.redirect(`${clientAppUrl}/`);
    }

    return res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Google OAuth callback error:', error);

    return googleAuthFailed(res, 401, 'Google authentication failed');
  }
}