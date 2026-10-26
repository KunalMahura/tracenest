'use strict';

/**
 * analytics.controller.js — Performance analytics API controller.
 *
 * Routes:
 *   GET /api/analytics/overview         — summary stats (total req, error rate, avg latency)
 *   GET /api/analytics/throughput       — time-series req/min chart data
 *   GET /api/analytics/latency          — p50/p95/p99 percentiles
 *   GET /api/analytics/top-endpoints    — slowest endpoints
 *   GET /api/analytics/top-failing      — endpoints with highest error rates
 */

const mongoose      = require('mongoose');
const Project       = require('../models/Project');
const logsService   = require('../services/logs.service');

// ── Shared ownership check ─────────────────────────────────────────
async function resolveProject(projectId, userId) {
  if (!projectId || !mongoose.isValidObjectId(projectId)) {
    return { error: 'Valid projectId query param is required', status: 400 };
  }
  const project = await Project.findOne({ _id: projectId, userId });
  if (!project) {
    return { error: 'Project not found', status: 404 };
  }
  return { project };
}

// ── GET /api/analytics/overview ─────────────────────────────────────
async function getOverview(req, res, next) {
  try {
    const { projectId, range = '1h' } = req.query;
    const { error, status } = await resolveProject(projectId, req.user.userId);
    if (error) return res.status(status).json({ success: false, error });

    const data = await logsService.getOverviewStats(projectId, range);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/analytics/throughput ───────────────────────────────────
async function getThroughput(req, res, next) {
  try {
    const { projectId, range = '1h', buckets = 30 } = req.query;
    const { error, status } = await resolveProject(projectId, req.user.userId);
    if (error) return res.status(status).json({ success: false, error });

    const data = await logsService.getThroughput(projectId, range, Number(buckets));
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/analytics/latency ──────────────────────────────────────
async function getLatency(req, res, next) {
  try {
    const { projectId, range = '1h' } = req.query;
    const { error, status } = await resolveProject(projectId, req.user.userId);
    if (error) return res.status(status).json({ success: false, error });

    const data = await logsService.getLatencyPercentiles(projectId, range);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/analytics/top-endpoints ───────────────────────────────
async function getTopEndpoints(req, res, next) {
  try {
    const { projectId, range = '1h', n = 10 } = req.query;
    const { error, status } = await resolveProject(projectId, req.user.userId);
    if (error) return res.status(status).json({ success: false, error });

    const data = await logsService.getSlowestEndpoints(projectId, range, Number(n));
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/analytics/top-failing ─────────────────────────────────
async function getTopFailing(req, res, next) {
  try {
    const { projectId, range = '1h', n = 10 } = req.query;
    const { error, status } = await resolveProject(projectId, req.user.userId);
    if (error) return res.status(status).json({ success: false, error });

    const data = await logsService.getTopFailingEndpoints(projectId, range, Number(n));
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOverview,
  getThroughput,
  getLatency,
  getTopEndpoints,
  getTopFailing,
};
