'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Rate limiters for different route groups.
 * Uses in-memory store (default) — correct for a single API instance.
 * If you scale the API horizontally, swap the store for rate-limit-redis.
 *
 * Behind Railway/Render/Vercel, app.js sets `trust proxy` so req.ip is the
 * real client IP rather than the load balancer's (otherwise every user would
 * share one bucket).
 */

// ── General API limiter (all routes) ──────────────────────────────
// 1000 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,  // Return RateLimit-* headers per RFC 6585
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests — please slow down' },
  // Health checks are polled by the platform; ingest has its own per-project limiter
  skip: (req) => req.path === '/health' || req.path.startsWith('/api/ingest'),
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
// High throughput: 10,000 requests per minute per PROJECT (keyed by the
// project resolved from X-API-Key — mount after apiKey middleware), so one
// noisy customer can't exhaust the limit for others sharing an IP, and a
// customer running many servers isn't throttled per IP.
// Daily volume is capped separately by the quota system.
const ingestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10000,
  keyGenerator: (req) => (req.project ? `project:${req.project._id}` : `ip:${req.ip}`),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Ingest rate limit exceeded' },
});

module.exports = { generalLimiter, authLimiter, ingestLimiter };
