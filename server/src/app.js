'use strict';

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const errorHandler    = require('./middleware/errorHandler.middleware');
const { generalLimiter } = require('./middleware/rateLimit.middleware');

const authRoutes      = require('./routes/auth.routes');
const projectRoutes   = require('./routes/project.routes');
const ingestRoutes    = require('./routes/ingest.routes');
const logsRoutes      = require('./routes/logs.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const alertsRoutes    = require('./routes/alerts.routes');
const sseRoutes       = require('./routes/sse.routes');

const app = express();

// ── Security headers ───────────────────────────────────────────────
app.use(helmet());

// ── CORS — allow all origins in dev; restrict in production ────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.ALLOWED_ORIGINS?.split(',') || false
    : '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
}));

// ── Request logging ────────────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Global rate limiter ────────────────────────────────────────────
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
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status:    'ok',
      service:   'tracenest-api',
      version:   '1.0.0',
      timestamp: new Date().toISOString(),
    },
  });
});

// ── API Routes ─────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/projects',  projectRoutes);
app.use('/api/ingest',    ingestRoutes);
// Phase 2 routes
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
