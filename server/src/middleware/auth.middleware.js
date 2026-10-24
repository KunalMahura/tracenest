'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * JWT authentication middleware.
 *
 * Expects:  Authorization: Bearer <token>
 * Attaches: req.user = { userId, email, iat, exp }
 *
 * Returns 401 if the header is missing, malformed, expired, or the signature is invalid.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authorization header missing or malformed. Expected: Bearer <token>',
    });
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    req.user = payload; // { userId, email, iat, exp }
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError'
      ? 'Token has expired — please log in again'
      : 'Token is invalid';

    return res.status(401).json({ success: false, error: message });
  }
}

module.exports = authMiddleware;
