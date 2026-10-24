'use strict';

const Project = require('../models/Project');

/**
 * API key authentication middleware.
 *
 * Expects:  X-API-Key: tn_<48hex chars>
 * Attaches: req.project = <Project document>
 *
 * Used on all /api/ingest routes — ingest auth is separate from user auth
 * so that apps can send logs without a user JWT.
 *
 * The raw key is hashed (SHA-256) before the DB lookup, so the actual
 * key is never stored in the database.
 */
async function apiKeyMiddleware(req, res, next) {
  const rawKey = req.headers['x-api-key'];

  if (!rawKey) {
    return res.status(401).json({
      success: false,
      error: 'Missing X-API-Key header',
    });
  }

  try {
    const project = await Project.findByApiKey(rawKey);

    if (!project) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive API key',
      });
    }

    req.project = project; // Attach to request for downstream use
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = apiKeyMiddleware;
