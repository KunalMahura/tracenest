'use strict';

/**
 * Central environment configuration.
 * All process.env reads happen here — the rest of the app imports from this file.
 * This makes it easy to validate, transform, and document every env var.
 */
require('dotenv').config();

const env = {
  PORT:         parseInt(process.env.PORT, 10) || 3000,
  NODE_ENV:     process.env.NODE_ENV || 'development',

  // MongoDB
  MONGO_URI:    process.env.MONGO_URI || 'mongodb://localhost:27017/tracenest',

  // Redis
  REDIS_HOST:   process.env.REDIS_HOST || 'localhost',
  REDIS_PORT:   parseInt(process.env.REDIS_PORT, 10) || 6379,

  // JWT
  JWT_SECRET:      process.env.JWT_SECRET || 'fallback_dev_secret_change_in_production',
  JWT_EXPIRES_IN:  process.env.JWT_EXPIRES_IN || '7d',

  // Log retention TTL (days)
  LOG_TTL_DAYS: parseInt(process.env.LOG_TTL_DAYS, 10) || 30,

  // Worker
  WORKER_BATCH_SIZE:   parseInt(process.env.WORKER_BATCH_SIZE, 10) || 100,
  WORKER_CONCURRENCY:  parseInt(process.env.WORKER_CONCURRENCY, 10) || 5,

  // Alerts
  ALERT_WEBHOOK_URL: process.env.ALERT_WEBHOOK_URL || '',

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

// Guard against running with fallback secret in production
if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'fallback_dev_secret_change_in_production') {
  throw new Error('FATAL: JWT_SECRET must be set to a secure value in production');
}

module.exports = env;
