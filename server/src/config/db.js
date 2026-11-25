'use strict';

const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

/** Connection string with the password removed — safe to log. */
function redactedUri(uri = env.MONGO_URI) {
  return uri.replace(/\/\/([^:@/]+):([^@/]+)@/, '//$1:****@');
}

/**
 * Connects to MongoDB using Mongoose.
 * Idempotent — safe to call multiple times; only connects once.
 */
async function connectDB() {
  if (mongoose.connection.readyState === 1) return;

  try {
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: env.STARTUP_TIMEOUT_MS, // Fail fast if Atlas is unreachable
      maxPoolSize: 20,
    });
    logger.info(`MongoDB connected → ${redactedUri()}`);
  } catch (err) {
    logger.error(`MongoDB connection failed (${redactedUri()}):`, err.message);
    throw err;
  }
}

/**
 * Verifies MongoDB is reachable by running a ping command.
 * @returns {Promise<void>} rejects if not connected or ping fails / times out
 */
async function pingMongo(timeoutMs = 2000) {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB is not connected');
  }
  let timer;
  try {
    await Promise.race([
      mongoose.connection.db.admin().command({ ping: 1 }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`MongoDB did not respond within ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected',  () => logger.info('MongoDB reconnected'));

module.exports = { connectDB, pingMongo, redactedUri };
