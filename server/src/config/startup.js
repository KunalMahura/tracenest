'use strict';

const env    = require('./env');
const logger = require('../utils/logger');
const { connectDB, redactedUri } = require('./db');
const { pingRedis, describeRedisTarget } = require('./redis');

/**
 * Verifies MongoDB and Redis are reachable before a process starts serving
 * traffic or consuming jobs. Throws a single error that names every failed
 * dependency and what to check, so a misconfigured deploy fails loudly at boot
 * instead of returning 500s later.
 */
async function verifyDependencies() {
  const failures = [];

  try {
    await connectDB();
  } catch (err) {
    failures.push(
      `MongoDB unreachable at ${redactedUri()} — ${err.message}\n` +
      '      Check MONGO_URI and that your Atlas Network Access list allows this host (0.0.0.0/0 for Railway).'
    );
  }

  try {
    await pingRedis(env.STARTUP_TIMEOUT_MS);
    logger.info(`Redis reachable → ${describeRedisTarget()}`);
  } catch (err) {
    failures.push(
      `Redis unreachable at ${describeRedisTarget()} — ${err.message}\n` +
      '      Check REDIS_URL (or REDIS_HOST/REDIS_PORT/REDIS_PASSWORD).'
    );
  }

  if (failures.length) {
    throw new Error(`Startup dependency check failed:\n  - ${failures.join('\n  - ')}`);
  }
}

module.exports = { verifyDependencies };
