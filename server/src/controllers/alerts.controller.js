'use strict';

/**
 * alerts.controller.js — Alert rule management and triggered alert history API.
 *
 * Routes:
 *   POST   /api/alerts/rules            — Create alert rule
 *   GET    /api/alerts/rules            — List alert rules for a project
 *   PATCH  /api/alerts/rules/:id        — Update rule (enable/disable, thresholds)
 *   DELETE /api/alerts/rules/:id        — Delete rule
 *
 *   GET    /api/alerts                  — List triggered alerts for a project
 *   PATCH  /api/alerts/:id/resolve      — Mark alert as resolved
 */

const mongoose  = require('mongoose');
const Project   = require('../models/Project');
const AlertRule = require('../models/AlertRule');
const Alert     = require('../models/Alert');
const logger    = require('../utils/logger');

// ── RULES ──────────────────────────────────────────────────────────

async function createRule(req, res, next) {
  try {
    const { projectId, name, conditionType, threshold, windowMinutes, webhookUrl } = req.body;

    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, error: 'Valid projectId is required' });
    }

    const project = await Project.findOne({ _id: projectId, userId: req.user.userId });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const rule = await AlertRule.create({
      projectId,
      name:           name?.trim(),
      conditionType,
      threshold:      Number(threshold),
      windowMinutes:  windowMinutes ? Number(windowMinutes) : 5,
      webhookUrl:     webhookUrl || undefined,
    });

    logger.info(`[alerts] Created rule "${name}" for project ${projectId}`);
    return res.status(201).json({ success: true, data: rule });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return res.status(422).json({ success: false, error: err.message });
    }
    next(err);
  }
}

async function listRules(req, res, next) {
  try {
    const { projectId } = req.query;
    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, error: 'Valid projectId is required' });
    }
    const project = await Project.findOne({ _id: projectId, userId: req.user.userId });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const rules = await AlertRule.find({ projectId }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: rules });
  } catch (err) {
    next(err);
  }
}

async function updateRule(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid rule ID' });
    }

    const rule = await AlertRule.findById(id);
    if (!rule) return res.status(404).json({ success: false, error: 'Rule not found' });

    // Ownership check via the rule's project
    const project = await Project.findOne({ _id: rule.projectId, userId: req.user.userId });
    if (!project) return res.status(403).json({ success: false, error: 'Access denied' });

    const allowed = ['name', 'conditionType', 'threshold', 'windowMinutes', 'webhookUrl', 'enabled'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) rule[field] = req.body[field];
    });
    await rule.save();

    return res.json({ success: true, data: rule });
  } catch (err) {
    next(err);
  }
}

async function deleteRule(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid rule ID' });
    }

    const rule = await AlertRule.findById(id);
    if (!rule) return res.status(404).json({ success: false, error: 'Rule not found' });

    const project = await Project.findOne({ _id: rule.projectId, userId: req.user.userId });
    if (!project) return res.status(403).json({ success: false, error: 'Access denied' });

    await rule.deleteOne();
    return res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
}

// ── TRIGGERED ALERTS ───────────────────────────────────────────────

async function listAlerts(req, res, next) {
  try {
    const { projectId, resolved, limit = 50, page = 1 } = req.query;
    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, error: 'Valid projectId is required' });
    }

    const project = await Project.findOne({ _id: projectId, userId: req.user.userId });
    if (!project) return res.status(404).json({ success: false, error: 'Project not found' });

    const filter = { projectId };
    if (resolved !== undefined) filter.resolved = resolved === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const [alerts, total] = await Promise.all([
      Alert.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Alert.countDocuments(filter),
    ]);

    return res.json({ success: true, data: { alerts, total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    next(err);
  }
}

async function resolveAlert(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid alert ID' });
    }

    const alert = await Alert.findById(id);
    if (!alert) return res.status(404).json({ success: false, error: 'Alert not found' });

    const project = await Project.findOne({ _id: alert.projectId, userId: req.user.userId });
    if (!project) return res.status(403).json({ success: false, error: 'Access denied' });

    if (alert.resolved) {
      return res.json({ success: true, data: alert }); // Idempotent
    }

    alert.resolved   = true;
    alert.resolvedAt = new Date();
    await alert.save();

    logger.info(`[alerts] Alert ${id} resolved by ${req.user.email}`);
    return res.json({ success: true, data: alert });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRule,
  listRules,
  updateRule,
  deleteRule,
  listAlerts,
  resolveAlert,
};
