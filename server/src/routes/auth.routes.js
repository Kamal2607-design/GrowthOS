import express from 'express';
import { register, login, getCurrentUser ,logout, googleCallback } from '../controllers/auth.controller.js';
import {authenticate} from '../middleware/auth.middleware.js';
import {
  createGoogleAuthorizationUrl,
} from '../services/google-oauth.service.js';
const router = express.Router();

//user registration and login routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, getCurrentUser);
router.post('/logout', logout);

// Google OAuth routes
router.get('/google', async (req, res) => {
  try {
    const {
      authorizationUrl,
      state,
      nonce,
      codeVerifier,
    } = await createGoogleAuthorizationUrl();

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.JWT_COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
      path: '/api/auth/google',
    };

    res.cookie('google_oauth_state', state, cookieOptions);

    res.cookie('google_oauth_nonce', nonce, cookieOptions);

    res.cookie(
      'google_oauth_code_verifier',
      codeVerifier,
      cookieOptions
    );

    return res.redirect(authorizationUrl.href);
  } catch (error) {
    console.error('Google OAuth start error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to start Google authentication',
    });
  }
});
router.get('/google/callback', googleCallback);

export default router;