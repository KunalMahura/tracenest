'use strict';

const { Redis } = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

/** Human-readable target for logs — never prints the password. */
function describeTarget() {
  if (env.REDIS_URL) {
    try {
      const u = new URL(env.REDIS_URL);
      return `${u.protocol}//${u.hostname}:${u.port || 6379}`;
    } catch {
      return 'REDIS_URL';
    }
  }
  return `${env.REDIS_HOST}:${env.REDIS_PORT}`;
}

/**
 * Creates a new ioredis connection.
 * BullMQ requires separate connections for Queue and Worker instances,
 * so this factory is called once per logical client.
 *
 * Uses REDIS_URL when set (redis:// or rediss:// for TLS), otherwise
 * REDIS_HOST + REDIS_PORT (+ optional REDIS_PASSWORD).
 *
 * Key options:
 *   - maxRetriesPerRequest: null  → required by BullMQ (disables ioredis retry limit)
 *   - enableReadyCheck: false     → allows BullMQ to connect before Redis is fully ready
 *   - family: 0                   → resolve both IPv4 and IPv6 (Railway's private
 *                                   network is IPv6-only)
 */
function createRedisConnection(overrides = {}) {
  const options = {
    maxRetriesPerRequest: null, // BullMQ requirement
    enableReadyCheck: false,
    lazyConnect: false,
    family: 0,
    ...overrides,
  };

  const connection = env.REDIS_URL
    ? new Redis(env.REDIS_URL, options)
    : new Redis({
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD,
        ...options,
      });

  const target = describeTarget();
  connection.on('connect', () => logger.info(`Redis connected → ${target}`));
  connection.on('error',   (err) => logger.error('Redis error:', err.message || err.code || String(err)));
  connection.on('close',   () => logger.debug('Redis connection closed'));

  return connection;
}

// ── Shared general-purpose client (quota counters, health checks, pub/sub publish) ──
let sharedClient = null;

/**
 * Returns a lazily-created shared Redis client.
 * Unlike the BullMQ connections, commands fail fast (maxRetriesPerRequest: 1)
 * so a Redis outage surfaces as an error instead of a hung request.
 */
function getRedis() {
  if (!sharedClient) {
    sharedClient = createRedisConnection({ maxRetriesPerRequest: 1, enableReadyCheck: true });
  }
  return sharedClient;
}

/**
 * PINGs Redis, rejecting if there is no reply within timeoutMs.
 * @returns {Promise<void>}
 */
async function pingRedis(timeoutMs = 2000) {
  let timer;
  try {
    await Promise.race([
      getRedis().ping(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Redis did not respond within ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { createRedisConnection, getRedis, pingRedis, describeRedisTarget: describeTarget };
