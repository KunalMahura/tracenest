'use strict';

/**
 * logs.controller.js — Log Explorer API controller.
 *
 * Routes:
 *   GET /api/logs           — searchLogs (paginated, filterable)
 *   GET /api/logs/:id       — getSingleLog (full detail with stack trace)
 *   DELETE /api/logs        — deleteLogsForProject (admin purge)
 */

const mongoose   = require('mongoose');
const Log        = require('../models/Log');
const Project    = require('../models/Project');
const logsService = require('../services/logs.service');
const logger     = require('../utils/logger');

// ── GET /api/logs ──────────────────────────────────────────────────
/**
 * Search and paginate logs for a project.
 *
 * Query params:
 *   projectId   (required) — project to query
 *   range       — '15m' | '1h' | '6h' | '24h' | '7d' | '30d'  (default: '1h')
 *   from / to   — ISO dates (override range if both provided)
 *   level       — 'debug' | 'info' | 'warn' | 'error'
 *   service     — partial match on endpoint / meta.service
 *   statusCode  — exact HTTP status code
 *   q           — full-text keyword search
 *   cursor      — ISO timestamp cursor for next-page fetch
 *   limit       — page size 1–200 (default: 50)
 */
async function searchLogs(req, res, next) {
  try {
    const { projectId, range, from, to, level, service, statusCode, q, cursor, limit } = req.query;

    if (!projectId) {
      return res.status(400).json({ success: false, error: 'projectId query param is required' });
    }
    if (!mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, error: 'Invalid projectId' });
    }

    // Ensure the project belongs to the authenticated user
    const project = await Project.findOne({ _id: projectId, userId: req.user.userId });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const result = await logsService.searchLogs(projectId, {
      range, from, to, level, service, statusCode, q, cursor, limit,
    });

    return res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ── GET /api/logs/:id ──────────────────────────────────────────────
async function getSingleLog(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid log ID' });
    }

    const log = await Log.findById(id).lean();
    if (!log) {
      return res.status(404).json({ success: false, error: 'Log not found' });
    }

    // Ensure the log's project belongs to the authenticated user
    const project = await Project.findOne({ _id: log.projectId, userId: req.user.userId });
    if (!project) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    return res.json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
}

// ── DELETE /api/logs ───────────────────────────────────────────────
/**
 * Purge all logs for a project. Requires ownership confirmation.
 * Query: projectId
 */
async function deleteLogs(req, res, next) {
  try {
    const { projectId } = req.query;
    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, error: 'Valid projectId is required' });
    }

    const project = await Project.findOne({ _id: projectId, userId: req.user.userId });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const pid    = mongoose.Types.ObjectId.createFromHexString(projectId);
    const result = await Log.deleteMany({ projectId: pid });

    logger.info(`[logs] Purged ${result.deletedCount} logs for project ${projectId}`);
    return res.json({ success: true, data: { deleted: result.deletedCount } });
  } catch (err) {
    next(err);
  }
}

module.exports = { searchLogs, getSingleLog, deleteLogs };
