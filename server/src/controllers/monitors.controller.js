'use strict';

/**
 * monitors.controller.js — Public URL uptime & latency monitors.
 *
 * Routes:
 *   GET    /api/monitors?projectId=<id>  — List monitors for a project (+ uptimePercent)
 *   POST   /api/monitors                 — Create monitor (max 10 per user, public URLs only)
 *   PATCH  /api/monitors/:id             — Update name / intervalMinutes / enabled
 *   POST   /api/monitors/:id/check       — Run a check right now
 *   DELETE /api/monitors/:id             — Delete monitor
 */

const mongoose = require('mongoose');
const Project  = require('../models/Project');
const Monitor  = require('../models/Monitor');
const { validatePublicUrl, runMonitorCheck, UnsafeUrlError } = require('../services/monitor.service');
const alertService = require('../services/alert.service');
const logger   = require('../utils/logger');

const MAX_MONITORS_PER_USER = 10;
const ALLOWED_INTERVALS     = [1, 5, 15];
const MANUAL_CHECK_COOLDOWN_MS = 5_000;

function withUptime(m) {
  return { ...m, uptimePercent: Monitor.computeUptime(m) };
}

/** Loads a monitor owned by the current user, or sends the error response. */
async function loadOwnedMonitor(req, res) {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, error: 'Invalid monitor ID' });
    return null;
  }
  const monitor = await Monitor.findOne({ _id: id, userId: req.user.userId });
  if (!monitor) {
    res.status(404).json({ success: false, error: 'Monitor not found' });
    return null;
  }
  return monitor;
}

async function listMonitors(req, res, next) {
  try {
    const { projectId } = req.query;
    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, error: 'Valid projectId is required' });
    }

    const project = await Project.findOne({ _id: projectId, userId: req.user.userId });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const monitors = await Monitor.find({ projectId, userId: req.user.userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: monitors.map(withUptime) });
  } catch (err) {
    next(err);
  }
}

async function createMonitor(req, res, next) {
  try {
    const { projectId, name, url } = req.body;
    const intervalMinutes = req.body.intervalMinutes === undefined ? 5 : Number(req.body.intervalMinutes);

    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, error: 'Valid projectId is required' });
    }
    if (!name || !String(name).trim()) {
      return res.status(422).json({ success: false, error: 'Name is required' });
    }
    if (!url || typeof url !== 'string') {
      return res.status(422).json({ success: false, error: 'URL is required' });
    }
    if (!ALLOWED_INTERVALS.includes(intervalMinutes)) {
      return res.status(422).json({ success: false, error: 'intervalMinutes must be 1, 5 or 15' });
    }

    const project = await Project.findOne({ _id: projectId, userId: req.user.userId });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const count = await Monitor.countDocuments({ userId: req.user.userId });
    if (count >= MAX_MONITORS_PER_USER) {
      return res.status(403).json({
        success: false,
        error: `Monitor limit reached (${MAX_MONITORS_PER_USER} per account). Delete one to add another.`,
      });
    }

    let parsed;
    try {
      parsed = await validatePublicUrl(url);
    } catch (err) {
      if (err instanceof UnsafeUrlError) {
        return res.status(422).json({ success: false, error: err.message });
      }
      throw err;
    }

    const monitor = await Monitor.create({
      userId:    req.user.userId,
      projectId,
      name:      String(name).trim(),
      url:       parsed.toString(),
      intervalMinutes,
      nextCheckAt: new Date(), // first scheduled check on the next scheduler tick
    });

    logger.info(`[monitors] Created monitor "${monitor.name}" (${monitor.url}) for project ${projectId}`);
    return res.status(201).json({ success: true, data: withUptime(monitor.toObject()) });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(422).json({ success: false, error: err.message });
    }
    next(err);
  }
}

async function updateMonitor(req, res, next) {
  try {
    const monitor = await loadOwnedMonitor(req, res);
    if (!monitor) return;

    const { name, intervalMinutes, enabled } = req.body;

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(422).json({ success: false, error: 'Name cannot be empty' });
      }
      monitor.name = String(name).trim();
    }

    if (intervalMinutes !== undefined) {
      const n = Number(intervalMinutes);
      if (!ALLOWED_INTERVALS.includes(n)) {
        return res.status(422).json({ success: false, error: 'intervalMinutes must be 1, 5 or 15' });
      }
      monitor.intervalMinutes = n;
      // Re-schedule relative to the last check with the new interval
      const base = monitor.lastCheckedAt ? monitor.lastCheckedAt.getTime() : Date.now();
      monitor.nextCheckAt = new Date(base + n * 60_000);
    }

    if (enabled !== undefined) {
      const next = Boolean(enabled);
      // Resuming → check soon instead of waiting a full interval
      if (next && !monitor.enabled) monitor.nextCheckAt = new Date();
      monitor.enabled = next;
    }

    await monitor.save();
    return res.json({ success: true, data: withUptime(monitor.toObject()) });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(422).json({ success: false, error: err.message });
    }
    next(err);
  }
}

async function checkMonitorNow(req, res, next) {
  try {
    const monitor = await loadOwnedMonitor(req, res);
    if (!monitor) return;

    // Light cooldown so "Check Now" can't be used to hammer a third-party site
    if (monitor.lastCheckedAt && Date.now() - monitor.lastCheckedAt.getTime() < MANUAL_CHECK_COOLDOWN_MS) {
      return res.status(429).json({ success: false, error: 'Checked moments ago — try again in a few seconds' });
    }

    const updated = await runMonitorCheck(monitor);
    if (!updated) return res.status(404).json({ success: false, error: 'Monitor not found' });

    // Alert evaluation is wired up in the worker process only; on-demand checks
    // run in the API process, so evaluate this project's rules here.
    alertService.evaluateRules(monitor.projectId).catch((err) => {
      logger.error(`[monitors] Alert evaluation error: ${err.message}`);
    });

    return res.json({ success: true, data: withUptime(updated) });
  } catch (err) {
    next(err);
  }
}

async function deleteMonitor(req, res, next) {
  try {
    const monitor = await loadOwnedMonitor(req, res);
    if (!monitor) return;

    await monitor.deleteOne();
    logger.info(`[monitors] Deleted monitor ${monitor._id}`);
    return res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listMonitors,
  createMonitor,
  updateMonitor,
  checkMonitorNow,
  deleteMonitor,
  MAX_MONITORS_PER_USER,
};
