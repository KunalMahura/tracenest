'use strict';

/**
 * Log Worker Process
 *
 * Consumes jobs from the BullMQ 'log-ingestion' queue.
 * For each job:
 *   1. Enriches raw log entries (adds expiresAt, normalises types)
 *   2. Writes to MongoDB using insertMany (batch = much faster than one-by-one)
 *   3. Emits LOG_BATCH_SAVED event → alert service evaluates rules
 *
 * This runs as a SEPARATE PROCESS from the API server (see docker-compose.yml).
 * Having it separate means a slow MongoDB write never blocks HTTP responses.
 */

// Load env before anything else
require('dotenv').config();

const { Worker } = require('bullmq');

const { createRedisConnection } = require('../config/redis');
const { connectDB }             = require('../config/db');
const Log                       = require('../models/Log');
const { appEvents, EVENTS }     = require('../utils/events');
const logger                    = require('../utils/logger');
const env                       = require('../config/env');
const { QUEUE_NAME }            = require('../queues/logQueue');
const alertService              = require('../services/alert.service');

const { WORKER_BATCH_SIZE, WORKER_CONCURRENCY } = env;

/**
 * Enriches a raw (pre-normalised) log entry before MongoDB insertion.
 * Adds the expiresAt field required by the TTL index.
 *
 * @param {string|ObjectId} projectId
 * @param {object}          raw        — normalised log from ingest service
 * @returns {object}                   — ready to insert into MongoDB
 */
function enrichLog(projectId, raw) {
  return {
    projectId,
    timestamp:  raw.timestamp ? new Date(raw.timestamp) : new Date(),
    level:      raw.level      || 'info',
    message:    raw.message,
    method:     raw.method,
    endpoint:   raw.endpoint,
    statusCode: raw.statusCode,
    durationMs: raw.durationMs,
    stack:      raw.stack,
    meta:       raw.meta,
    expiresAt:  Log.makeExpiresAt(), // TTL field — Mongo deletes doc after LOG_TTL_DAYS
  };
}

/**
 * Processes a single BullMQ job.
 * Splits the job's log array into sub-batches and insertMany's each one.
 *
 * Using sub-batches instead of one giant insertMany:
 *   - Avoids MongoDB 16MB document/batch limits
 *   - Gives finer-grained retry granularity
 */
async function processJob(job) {
  const { projectId, logs } = job.data;

  if (!logs || logs.length === 0) {
    logger.warn(`Job ${job.id}: empty logs array, skipping`);
    return;
  }

  const enriched = logs.map((raw) => enrichLog(projectId, raw));

  // Split into WORKER_BATCH_SIZE chunks for insertMany
  let totalSaved = 0;
  for (let i = 0; i < enriched.length; i += WORKER_BATCH_SIZE) {
    const chunk = enriched.slice(i, i + WORKER_BATCH_SIZE);

    // ordered: false → continue inserting even if one document fails (e.g. TTL conflict)
    await Log.insertMany(chunk, { ordered: false });
    totalSaved += chunk.length;
  }

  logger.info(`[worker] Job ${job.id}: saved ${totalSaved} logs for project ${projectId}`);

  // Emit event — alert service evaluates rules for this project
  appEvents.emit(EVENTS.LOG_BATCH_SAVED, { projectId, count: totalSaved });
}

/**
 * Starts the worker.
 * Connects to MongoDB, wires up the alert listener, then starts consuming jobs.
 */
async function startWorker() {
  logger.info('Starting log worker...');
  await connectDB();

  // Wire up alert evaluation — runs after every saved batch
  appEvents.on(EVENTS.LOG_BATCH_SAVED, async ({ projectId }) => {
    try {
      await alertService.evaluateRules(projectId);
    } catch (err) {
      logger.error('[worker] Alert evaluation error:', err.message);
    }
  });

  const worker = new Worker(QUEUE_NAME, processJob, {
    connection:  createRedisConnection(),
    concurrency: WORKER_CONCURRENCY,
  });

  worker.on('completed', (job) => {
    logger.info(`[worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`[worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}): ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.error('[worker] Worker error:', err.message);
  });

  logger.info(
    `Log worker ready (queue="${QUEUE_NAME}", concurrency=${WORKER_CONCURRENCY}, batchSize=${WORKER_BATCH_SIZE})`
  );

  // Graceful shutdown — wait for in-progress jobs to finish
  const gracefulShutdown = async (signal) => {
    logger.info(`[worker] ${signal} received — closing worker gracefully...`);
    await worker.close();
    logger.info('[worker] Worker closed');
    process.exit(0);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('[worker] Unhandled rejection:', reason);
  });
}

startWorker().catch((err) => {
  logger.error('Failed to start worker:', err.message);
  process.exit(1);
});
