'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Rate limiters for different route groups.
 * Uses in-memory store (default) — sufficient for single-instance dev.
 * For multi-instance prod, swap store for rate-limit-redis.
 */

// ── General API limiter (all routes) ──────────────────────────────
// 1000 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,  // Return RateLimit-* headers per RFC 6585
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests — please slow down' },
  skip: (req) => req.path === '/health', // Don't rate-limit health checks
});

// ── Auth limiter (register/login) ─────────────────────────────────
// Tighter limit to slow down brute-force attempts
// 20 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many auth attempts — please try again in 15 minutes' },
});

// ── Ingest limiter ────────────────────────────────────────────────
// High throughput: 10,000 requests per minute per IP
// In practice, SDK clients should batch and not hit this
const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Ingest rate limit exceeded' },
});

module.exports = { generalLimiter, authLimiter, ingestLimiter };
