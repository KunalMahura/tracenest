'use strict';

const logger = require('../utils/logger');

/**
 * Centralized Express error handler.
 *
 * MUST be registered last in app.js (after all routes).
 * Express identifies error handlers by their 4-parameter signature: (err, req, res, next).
 *
 * Converts any thrown/passed error into a consistent JSON response:
 *   { success: false, error: "...", details?: [...] }
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Log the full error with context — stack trace included
  logger.error(`[${req.method} ${req.path}] ${err.message}`);
  if (err.stack) logger.error(err.stack);

  // ── Mongoose: field-level validation errors ──────────────────────
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: Object.values(err.errors).map((e) => ({
        field:   e.path,
        message: e.message,
      })),
    });
  }

  // ── MongoDB: duplicate key violation ─────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'unknown';
    return res.status(409).json({
      success: false,
      error: `Duplicate value for field: ${field}`,
    });
  }

  // ── Mongoose: invalid ObjectId cast ──────────────────────────────
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Invalid value for field: ${err.path}`,
    });
  }

  // ── JWT errors are handled in auth middleware, not here ──────────

  // ── Default: use status from error object or fall back to 500 ────
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: err.message || 'Internal server error',
  });
}

module.exports = errorHandler;
