'use strict';

const { Queue } = require('bullmq');
const { createRedisConnection } = require('../config/redis');
const logger = require('../utils/logger');

const QUEUE_NAME = 'log-ingestion';

/**
 * BullMQ Queue for log ingestion.
 *
 * The API server pushes jobs here; the worker process consumes them.
 * This decoupling means the API always responds 202 immediately,
 * even when MongoDB is slow or under heavy write load.
 *
 * Job retry policy:
 *   - Up to 3 attempts with exponential backoff
 *   - Keeps last 100 completed + 500 failed jobs for debugging
 */
const logQueue = new Queue(QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts:  3,
    backoff:   { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 500 },
  },
});

logQueue.on('error', (err) => logger.error('LogQueue error:', err.message));

/**
 * Pushes a batch of normalized log entries onto the queue.
 *
 * @param {string|ObjectId} projectId  — MongoDB project ID
 * @param {object[]}        logs       — array of normalized log objects
 */
async function enqueueLogBatch(projectId, logs) {
  await logQueue.add(
    'process-batch',
    { projectId: projectId.toString(), logs },
    { priority: 1 }
  );
}

module.exports = { logQueue, enqueueLogBatch, QUEUE_NAME };
