'use strict';

const express   = require('express');
const router    = express.Router();
const authMiddleware = require('../middleware/auth.middleware');
const ctrl = require('../controllers/analytics.controller');

router.use(authMiddleware);

// GET /api/analytics/overview      — dashboard summary card
router.get('/overview',      ctrl.getOverview);

// GET /api/analytics/throughput    — time-series requests/errors chart
router.get('/throughput',    ctrl.getThroughput);

// GET /api/analytics/latency       — p50/p95/p99 latency stats
router.get('/latency',       ctrl.getLatency);

// GET /api/analytics/top-endpoints — slowest endpoints by avg latency
router.get('/top-endpoints', ctrl.getTopEndpoints);

// GET /api/analytics/top-failing   — endpoints with highest error counts
router.get('/top-failing',   ctrl.getTopFailing);

module.exports = router;
