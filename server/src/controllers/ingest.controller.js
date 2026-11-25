'use strict';

const { ingestBatch } = require('../services/ingest.service');
const { setQuotaHeaders } = require('../services/quota.service');
const { NDJSONParser, collectStream } = require('../utils/streamHelpers');

/**
 * Runs an ingest and writes the response, including X-Quota-* headers on
 * both success (202) and quota rejection (429).
 */
async function respond(req, res, next, rawLogs) {
  try {
    const { queued, quota } = await ingestBatch(req.project, rawLogs);
    setQuotaHeaders(res, quota);
    res.status(202).json({ success: true, data: { queued, quota } });
  } catch (err) {
    if (err.quota) {
      setQuotaHeaders(res, err.quota);
      res.setHeader('Retry-After', Math.max(1, Math.ceil((new Date(err.quota.resetsAt) - Date.now()) / 1000)));
      return res.status(429).json({ success: false, error: err.message, data: { quota: err.quota } });
    }
    next(err);
  }
}

/**
 * POST /api/ingest
 * Ingests a single log entry.
 * Responds 202 Accepted immediately — actual DB write happens in worker.
 */
function ingestSingle(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ success: false, error: 'Request body must be a JSON log object' });
  }
  return respond(req, res, next, [req.body]);
}

/**
 * POST /api/ingest/batch
 * Ingests an array of log entries (up to 1000 per request).
 * Responds 202 Accepted immediately.
 */
function ingestBatchHandler(req, res, next) {
  // Accept either an array directly or a { logs: [...] } wrapper
  const rawLogs = Array.isArray(req.body) ? req.body : req.body?.logs;

  if (!rawLogs) {
    return res.status(400).json({
      success: false,
      error: 'Request body must be an array of log objects, or { logs: [...] }',
    });
  }

  return respond(req, res, next, rawLogs);
}

/**
 * POST /api/ingest/stream
 * Ingests logs from an NDJSON (Newline-Delimited JSON) request body.
 *
 * Useful for bulk uploads — streams the request body without loading
 * everything into memory at once. Content-Type: application/x-ndjson
 *
 * The bodyParser middleware is skipped for this route (configured in app.js).
 */
async function ingestStream(req, res, next) {
  try {
    const parser = new NDJSONParser();

    // Pipe the raw HTTP request body through our NDJSON parser
    req.pipe(parser);

    // Collect all parsed objects into an array (memory-efficient for reasonable uploads)
    const rawLogs = await collectStream(parser);

    if (rawLogs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid NDJSON log entries found in request body',
      });
    }

    return respond(req, res, next, rawLogs);
  } catch (err) {
    next(err);
  }
}

module.exports = { ingestSingle, ingestBatchHandler, ingestStream };
