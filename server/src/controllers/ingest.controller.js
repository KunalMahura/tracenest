'use strict';

const { ingestBatch } = require('../services/ingest.service');
const { NDJSONParser, collectStream } = require('../utils/streamHelpers');

/**
 * POST /api/ingest
 * Ingests a single log entry.
 * Responds 202 Accepted immediately — actual DB write happens in worker.
 */
async function ingestSingle(req, res, next) {
  try {
    await ingestBatch(req.project._id, [req.body]);
    res.status(202).json({ success: true, data: { queued: 1 } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/ingest/batch
 * Ingests an array of log entries (up to 1000 per request).
 * Responds 202 Accepted immediately.
 */
async function ingestBatchHandler(req, res, next) {
  try {
    // Accept either an array directly or a { logs: [...] } wrapper
    const rawLogs = Array.isArray(req.body) ? req.body : req.body.logs;

    if (!rawLogs) {
      return res.status(400).json({
        success: false,
        error: 'Request body must be an array of log objects, or { logs: [...] }',
      });
    }

    const count = await ingestBatch(req.project._id, rawLogs);
    res.status(202).json({ success: true, data: { queued: count } });
  } catch (err) {
    next(err);
  }
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

    const count = await ingestBatch(req.project._id, rawLogs);
    res.status(202).json({ success: true, data: { queued: count } });
  } catch (err) {
    next(err);
  }
}

module.exports = { ingestSingle, ingestBatchHandler, ingestStream };
