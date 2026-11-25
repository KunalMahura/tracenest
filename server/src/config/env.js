'use strict';

require('dotenv').config();

/**
 * Centralised, validated environment configuration.
 *
 * Every other module reads config from here — never from process.env directly —
 * so defaults and production checks live in one place.
 */

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd   = NODE_ENV === 'production';

function int(name, fallback) {
  const n = parseInt(process.env[name], 10);
  return Number.isFinite(n) ? n : fallback;
}

function list(name) {
  return (process.env[name] || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

const env = {
  PORT:     int('PORT', 3000),
  NODE_ENV,
  isProd,

  // ── MongoDB ──────────────────────────────────────────────────────
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/tracenest',

  // ── Redis ────────────────────────────────────────────────────────
  // REDIS_URL (redis:// or rediss://) wins when set — Railway, Render, Upstash
  // and most hosts hand you a single connection string. REDIS_HOST/PORT/PASSWORD
  // remain for local Docker development.
  REDIS_URL:      process.env.REDIS_URL || '',
  REDIS_HOST:     process.env.REDIS_HOST || 'localhost',
  REDIS_PORT:     int('REDIS_PORT', 6379),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,

  // ── Auth ─────────────────────────────────────────────────────────
  JWT_SECRET:     process.env.JWT_SECRET || 'fallback_dev_secret_change_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  // ── CORS ─────────────────────────────────────────────────────────
  // DASHBOARD_URL: the deployed dashboard (e.g. https://tracenest.vercel.app).
  // ALLOWED_ORIGINS: extra comma-separated origins allowed to call the
  // dashboard/management API. The ingest API is open to every origin.
  DASHBOARD_URL:   (process.env.DASHBOARD_URL || '').replace(/\/$/, ''),
  ALLOWED_ORIGINS: list('ALLOWED_ORIGINS'),

  // Number of reverse proxies in front of the API (Railway/Render/Vercel = 1).
  // Needed so rate limiting sees the real client IP instead of the proxy's.
  TRUST_PROXY: int('TRUST_PROXY', isProd ? 1 : 0),

  // ── Quotas ───────────────────────────────────────────────────────
  DEFAULT_DAILY_LOG_QUOTA: int('DEFAULT_DAILY_LOG_QUOTA', 10000),
  MAX_PROJECTS_PER_USER:   int('MAX_PROJECTS_PER_USER', 5),

  // ── Data retention & worker ──────────────────────────────────────
  LOG_TTL_DAYS:       int('LOG_TTL_DAYS', 30),
  WORKER_BATCH_SIZE:  int('WORKER_BATCH_SIZE', 100),
  WORKER_CONCURRENCY: int('WORKER_CONCURRENCY', 5),

  // ── Misc ─────────────────────────────────────────────────────────
  STARTUP_TIMEOUT_MS: int('STARTUP_TIMEOUT_MS', 15000),
  ALERT_WEBHOOK_URL:  process.env.ALERT_WEBHOOK_URL || '',
  LOG_LEVEL:          process.env.LOG_LEVEL || 'info',
};

/** Every origin allowed to call the dashboard/management API. */
env.CORS_ORIGINS = [...new Set([env.DASHBOARD_URL, ...env.ALLOWED_ORIGINS].filter(Boolean))];

// ── Production safety checks — fail fast with a clear message ─────
if (isProd) {
  const problems = [];

  if (env.JWT_SECRET === 'fallback_dev_secret_change_in_production' || env.JWT_SECRET.length < 32) {
    problems.push('JWT_SECRET must be set to a random string of at least 32 characters');
  }
  if (!process.env.MONGO_URI) {
    problems.push('MONGO_URI must be set (e.g. your MongoDB Atlas connection string)');
  }
  if (!env.REDIS_URL && !process.env.REDIS_HOST) {
    problems.push('REDIS_URL (or REDIS_HOST/REDIS_PORT) must be set');
  }
  if (problems.length) {
    throw new Error(`FATAL: invalid production configuration:\n  - ${problems.join('\n  - ')}`);
  }
}

module.exports = env;
