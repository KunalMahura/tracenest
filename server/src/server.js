'use strict';

/**
 * server.js — Entry point for the TraceNest API process.
 *
 * Responsibilities:
 *   - Verify MongoDB and Redis are reachable BEFORE accepting requests
 *   - Bridge worker events (saved logs, alerts) from Redis into the SSE feed
 *   - Start the HTTP server
 *   - Handle graceful shutdown on SIGTERM / SIGINT
 *   - Catch unhandled errors to prevent silent process hangs
 *
 * Note: This file only wires infrastructure.
 * All Express logic lives in app.js.
 */

const http     = require('http');
const mongoose = require('mongoose');

const env    = require('./config/env');
const logger = require('./utils/logger');
const app    = require('./app');
const { verifyDependencies }       = require('./config/startup');
const { createRedisConnection, getRedis } = require('./config/redis');
const { subscribeEventsFromRedis } = require('./utils/events');

const server = http.createServer(app);
let subscriber = null;

async function start() {
  try {
    await verifyDependencies();

    // Dedicated connection — a subscribed ioredis client can't run other commands
    subscriber = createRedisConnection();
    await subscribeEventsFromRedis(subscriber, logger);

    server.listen(env.PORT, () => {
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.info(`  TraceNest API  |  port ${env.PORT}  |  ${env.NODE_ENV}`);
      logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    });
  } catch (err) {
    logger.error(`FATAL: ${err.message}`);
    logger.error('TraceNest API is exiting because a required dependency is unavailable.');
    process.exit(1);
  }
}

// ── Graceful shutdown ──────────────────────────────────────────────
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received — shutting down gracefully`);

  // Force-kill if shutdown takes too long (e.g. open SSE connections)
  setTimeout(() => {
    logger.error('Shutdown timeout exceeded — forcing exit');
    process.exit(1);
  }, 10_000).unref();

  // Stop accepting new connections; finish in-flight requests
  server.close(async () => {
    logger.info('HTTP server closed');
    await Promise.allSettled([
      subscriber?.quit(),
      getRedis().quit(),
      mongoose.connection.close(),
    ]);
    process.exit(0);
  });
  // SSE connections never end on their own — close idle keep-alives
  server.closeIdleConnections?.();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// ── Unhandled errors — log them and exit ──────────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection:', reason);
  if (env.isProd) process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception:', err.message, err.stack);
  process.exit(1); // Always exit on uncaught — process state is unknown
});

start();
