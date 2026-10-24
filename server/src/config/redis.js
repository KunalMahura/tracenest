'use strict';

const { Redis } = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

/**
 * Creates a new ioredis connection.
 * BullMQ requires separate connections for Queue and Worker instances,
 * so this factory is called once per logical client.
 *
 * Key options:
 *   - maxRetriesPerRequest: null  → required by BullMQ (disables ioredis retry limit)
 *   - enableReadyCheck: false     → allows BullMQ to connect before Redis is fully ready
 */
function createRedisConnection(overrides = {}) {
  const connection = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    maxRetriesPerRequest: null,  // BullMQ requirement
    enableReadyCheck: false,
    lazyConnect: false,
    ...overrides,
  });

  connection.on('connect',  () => logger.info(`Redis connected → ${env.REDIS_HOST}:${env.REDIS_PORT}`));
  connection.on('ready',    () => logger.info('Redis ready'));
  connection.on('error',    (err) => logger.error('Redis error:', err.message));
  connection.on('close',    () => logger.warn('Redis connection closed'));

  return connection;
}

module.exports = { createRedisConnection };
