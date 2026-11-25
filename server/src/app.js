'use strict';

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const env             = require('./config/env');
const logger          = require('./utils/logger');
const { pingMongo }   = require('./config/db');
const { pingRedis }   = require('./config/redis');
const errorHandler    = require('./middleware/errorHandler.middleware');
const { generalLimiter } = require('./middleware/rateLimit.middleware');

const authRoutes      = require('./routes/auth.routes');
const projectRoutes   = require('./routes/project.routes');
const ingestRoutes    = require('./routes/ingest.routes');
const logsRoutes      = require('./routes/logs.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const alertsRoutes    = require('./routes/alerts.routes');
const sseRoutes       = require('./routes/sse.routes');

const { version } = require('../package.json');

const app = express();

// ── Proxy awareness ────────────────────────────────────────────────
// Railway/Render terminate TLS at a load balancer. Without this, req.ip is the
// balancer's IP and every user shares a single rate-limit bucket.
if (env.TRUST_PROXY) app.set('trust proxy', env.TRUST_PROXY);

// ── Security headers ───────────────────────────────────────────────
app.use(helmet());

// ── CORS ───────────────────────────────────────────────────────────
// Two policies:
//   1. /api/ingest — open to ANY origin. Customers' apps (and browser code on
//      their sites) send logs here; the X-API-Key header is the credential,
//      not the origin. No cookies are involved, so `*` is safe.
//   2. Everything else (auth, projects, logs, analytics, SSE) — only the
//      dashboard (DASHBOARD_URL) and ALLOWED_ORIGINS. In development, any origin.
const ingestCors = cors({
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
  exposedHeaders: ['X-Quota-Limit', 'X-Quota-Used', 'X-Quota-Remaining', 'X-Quota-Reset', 'Retry-After'],
  maxAge: 86400,
});

if (env.isProd && env.CORS_ORIGINS.length === 0) {
  logger.warn('DASHBOARD_URL / ALLOWED_ORIGINS not set — browsers will be blocked from the dashboard API');
}

const dashboardCors = cors({
  origin: env.isProd ? env.CORS_ORIGINS : true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
});

app.use((req, res, next) => (
  req.path.startsWith('/api/ingest') ? ingestCors(req, res, next) : dashboardCors(req, res, next)
));

// ── Request logging (skip platform health probes) ─────────────────
app.use(morgan(env.isProd ? 'combined' : 'dev', {
  skip: (req) => req.path === '/health',
}));

// ── Global rate limiter (skips /health and /api/ingest) ───────────
app.use(generalLimiter);

// ── Body parsing ───────────────────────────────────────────────────
// IMPORTANT: Skip JSON body parser for the NDJSON stream endpoint.
// That route pipes req directly into the NDJSONParser stream.
app.use((req, res, next) => {
  if (req.path === '/api/ingest/stream') {
    return next(); // Don't buffer the body — let the controller stream it
  }
  express.json({ limit: '10mb' })(req, res, next);
});

// ── Health check — no auth, no rate limit ─────────────────────────
// Actively pings MongoDB and Redis. Returns 503 if either is down so the
// platform (Railway/Docker) can mark the instance unhealthy and restart it.
app.get('/health', async (_req, res) => {
  const check = async (fn) => {
    const started = Date.now();
    try {
      await fn();
      return { status: 'up', latencyMs: Date.now() - started };
    } catch (err) {
      return { status: 'down', error: err.message };
    }
  };

  const [mongodb, redis] = await Promise.all([check(() => pingMongo()), check(() => pingRedis())]);
  const healthy = mongodb.status === 'up' && redis.status === 'up';

  res.status(healthy ? 200 : 503).json({
    success: healthy,
    data: {
      status:    healthy ? 'ok' : 'degraded',
      service:   'tracenest-api',
      version,
      uptimeSec: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      checks:    { mongodb, redis },
    },
  });
});

// ── API Routes ─────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/projects',  projectRoutes);
app.use('/api/ingest',    ingestRoutes);
app.use('/api/logs',      logsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/alerts',    alertsRoutes);
app.use('/api/sse',       sseRoutes);

// ── 404 catch-all ──────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error:   `Route not found: ${req.method} ${req.path}`,
  });
});

// ── Centralized error handler ──────────────────────────────────────
// Must be registered AFTER all routes
app.use(errorHandler);

module.exports = app;
