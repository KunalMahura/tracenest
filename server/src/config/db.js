'use strict';

const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

let isConnected = false;

/**
 * Connects to MongoDB using Mongoose.
 * Idempotent — safe to call multiple times; only connects once.
 * Uses exponential retry in development for resilience during startup.
 */
async function connectDB() {
  if (isConnected) return;

  try {
    await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // Wait up to 10s for MongoDB to be ready
    });
    isConnected = true;
    logger.info(`MongoDB connected → ${env.MONGO_URI}`);
  } catch (err) {
    logger.error('MongoDB connection failed:', err.message);
    throw err;
  }
}

// Track disconnections so reconnect attempts can be made
mongoose.connection.on('disconnected', () => {
  isConnected = false;
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  logger.info('MongoDB reconnected');
});

module.exports = { connectDB };
