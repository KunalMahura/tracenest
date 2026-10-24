'use strict';

const { Router } = require('express');

const {
  ingestSingle,
  ingestBatchHandler,
  ingestStream,
} = require('../controllers/ingest.controller');

const apiKeyMiddleware = require('../middleware/apiKey.middleware');
const { ingestLimiter } = require('../middleware/rateLimit.middleware');

const router = Router();

// All ingest routes are authenticated via X-API-Key header
router.use(apiKeyMiddleware);
router.use(ingestLimiter);

// POST /api/ingest        — single log entry (JSON body)
router.post('/', ingestSingle);

// POST /api/ingest/batch  — array of log entries (JSON array body)
router.post('/batch', ingestBatchHandler);

// POST /api/ingest/stream — NDJSON stream body
// Note: bodyParser is bypassed for this route in app.js
// so that we can pipe req directly to the stream parser
router.post('/stream', (req, _res, next) => {
  // Give large uploads extra time
  req.setTimeout(60_000);
  next();
}, ingestStream);

module.exports = router;
