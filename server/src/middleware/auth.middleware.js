import jwt from 'jsonwebtoken';

import { getAuthCookieName } from '../config/auth-cookie.js';

export function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    let token = null;

    // Allow Bearer token for API clients/development
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Otherwise use the auth cookie (browser clients)
    if (!token) {
      token = req.cookies?.[getAuthCookieName()];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = {
      id: Number(decoded.sub),
      email: decoded.email,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
}