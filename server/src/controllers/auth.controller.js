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

export async function register(req, res) {
  try {
    const { email, password, name, username } = req.body;

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
    const { email, password } = req.body;

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
    res.cookie(
  process.env.JWT_COOKIE_NAME || 'growthos_tokennn',
  result.token,
  {
    httpOnly: true,
    secure: process.env.JWT_COOKIE_SECURE === 'true',
    sameSite: process.env.JWT_COOKIE_SAME_SITE || 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  }
);
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
    res.clearCookie(
      process.env.JWT_COOKIE_NAME || 'growthos_token',
      {
        httpOnly: true,
        secure: process.env.JWT_COOKIE_SECURE === 'true',
        sameSite: process.env.JWT_COOKIE_SAME_SITE || 'lax',
        path: '/',
      }
    );

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

export async function googleCallback(req, res) {
  try {
    const state = req.cookies.google_oauth_state;
    const nonce = req.cookies.google_oauth_nonce;
    const codeVerifier =
      req.cookies.google_oauth_code_verifier;

    if (!state || !nonce || !codeVerifier) {
      return res.status(400).json({
        success: false,
        message: 'Google OAuth session expired or is invalid',
      });
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
      return res.status(400).json({
        success: false,
        message: 'Unable to retrieve Google account information',
      });
    }

    const googleUser = {
      providerAccountId: claims.sub,
      email: claims.email,
      name: claims.name,
      emailVerified: claims.email_verified,
    };

    if (!googleUser.providerAccountId) {
      return res.status(400).json({
        success: false,
        message: 'Google account ID was not provided',
      });
    }

    if (!googleUser.email) {
      return res.status(400).json({
        success: false,
        message: 'Google account email was not provided',
      });
    }

    if (googleUser.emailVerified !== true) {
      return res.status(400).json({
        success: false,
        message: 'Google email is not verified',
      });
    }

    const user = await loginOrCreateGoogleUser({
      providerAccountId: googleUser.providerAccountId,
      email: googleUser.email,
      name: googleUser.name,
    });

    const token = createAuthToken(user);

    res.cookie(
      process.env.JWT_COOKIE_NAME || 'growthos_token',
      token,
      {
        httpOnly: true,
        secure: process.env.JWT_COOKIE_SECURE === 'true',
        sameSite: process.env.JWT_COOKIE_SAME_SITE || 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      }
    );

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

    return res.status(401).json({
      success: false,
      message: 'Google authentication failed',
    });
  }
}