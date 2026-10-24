'use strict';

const { enqueueLogBatch } = require('../queues/logQueue');
const logger = require('../utils/logger');

/** Valid log levels — anything else defaults to 'info' */
const VALID_LEVELS = new Set(['debug', 'info', 'warn', 'error']);

/** Valid HTTP methods */
const VALID_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

/**
 * Normalizes and sanitizes a single raw log entry from the API.
 *
 * - Truncates long strings to prevent oversized documents
 * - Coerces types (e.g. statusCode to integer)
 * - Falls back to safe defaults for missing/invalid fields
 * - Never throws — invalid values get a safe default
 *
 * @param {object} raw  — raw log object from the request body
 * @returns {object}    — sanitized log object ready for the queue
 */
function normalizeLog(raw) {
  const method = raw.method ? String(raw.method).toUpperCase() : undefined;

  return {
    level:      VALID_LEVELS.has(raw.level) ? raw.level : 'info',
    message:    String(raw.message || 'No message').slice(0, 5000),
    method:     VALID_METHODS.has(method) ? method : undefined,
    endpoint:   raw.endpoint    ? String(raw.endpoint).slice(0, 500)   : undefined,
    statusCode: raw.statusCode  ? parseInt(raw.statusCode, 10)         : undefined,
    durationMs: raw.durationMs  ? parseFloat(raw.durationMs)           : undefined,
    stack:      raw.stack       ? String(raw.stack).slice(0, 10000)    : undefined,
    meta:       raw.meta && typeof raw.meta === 'object' ? raw.meta    : undefined,

    // Allow SDKs to send the original event timestamp (e.g. when batching with delay)
    // But fall back to now if missing or invalid
    timestamp: raw.timestamp && !isNaN(new Date(raw.timestamp))
      ? new Date(raw.timestamp)
      : new Date(),
  };
}

/**
 * Ingests a batch of raw log entries for a project.
 *
 * Validates batch size, normalizes each entry, then pushes to the Redis queue.
 * The actual MongoDB write happens in the worker process.
 *
 * @param {string|ObjectId} projectId  — project to ingest into
 * @param {object[]}        rawLogs    — raw log objects from request
 * @returns {Promise<number>}          — number of logs queued
 */
async function ingestBatch(projectId, rawLogs) {
  if (!Array.isArray(rawLogs) || rawLogs.length === 0) {
    const err = new Error('logs must be a non-empty array');
    err.status = 400;
    throw err;
  }

  const MAX_BATCH = 1000;
  if (rawLogs.length > MAX_BATCH) {
    const err = new Error(`Batch size ${rawLogs.length} exceeds maximum of ${MAX_BATCH}`);
    err.status = 400;
    throw err;
  }

  const normalized = rawLogs.map(normalizeLog);
  await enqueueLogBatch(projectId, normalized);

  logger.info(`[ingest] Queued ${normalized.length} logs for project ${projectId}`);
  return normalized.length;
}

module.exports = { ingestBatch, normalizeLog };
