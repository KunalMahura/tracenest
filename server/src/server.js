'use strict';

/**
 * server.js — Entry point for the TraceNest API process.
 *
 * Responsibilities:
 *   - Connect to MongoDB
 *   - Start the HTTP server
 *   - Handle graceful shutdown on SIGTERM / SIGINT
 *   - Catch unhandled errors to prevent silent process hangs
 *
 * Note: This file only wires infrastructure.
 * All Express logic lives in app.js.
 */

const http = require('http');

const app           = require('./app');
const { connectDB } = require('./config/db');
const env           = require('./config/env');
const logger        = require('./utils/logger');

const server = http.createServer(app);

async function start() {
  try {
    // Connect to MongoDB before accepting requests
    await connectDB();

    server.listen(env.PORT, () => {
      logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      logger.info(`  TraceNest API  |  port ${env.PORT}  |  ${env.NODE_ENV}`);
      logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    });

  } catch (err) {
    logger.error('Startup failed:', err.message);
    process.exit(1);
  }
}

// ── Graceful shutdown ──────────────────────────────────────────────
function shutdown(signal) {
  logger.info(`${signal} received — shutting down gracefully`);

  // Stop accepting new connections; finish in-flight requests
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force-kill if shutdown takes too long (e.g. stuck request)
  setTimeout(() => {
    logger.error('Shutdown timeout exceeded — forcing exit');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Unhandled errors — log them and exit ──────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection:', reason);
  // Don't exit here in dev — just log and continue
  if (env.NODE_ENV === 'production') process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err.message, err.stack);
  process.exit(1); // Always exit on uncaught — process state is unknown
});

start();
