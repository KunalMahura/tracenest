'use strict';

const express   = require('express');
const router    = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const { connectSSE } = require('../controllers/sse.controller');

/**
 * Middleware that accepts JWT from either:
 *   1. Authorization: Bearer <token>  header (standard)
 *   2. ?token=<token>                  query param (needed for EventSource in browsers)
 *
 * EventSource API doesn't support custom request headers, so dashboards
 * pass the token as a query parameter.
 */
function sseAuthMiddleware(req, res, next) {
  const queryToken = req.query.token;
  if (queryToken && !req.headers.authorization) {
    req.headers.authorization = `Bearer ${queryToken}`;
  }
  return authMiddleware(req, res, next);
}

// GET /api/sse/events?projectId=<id>&token=<jwt>
router.get('/events', sseAuthMiddleware, connectSSE);

module.exports = router;
