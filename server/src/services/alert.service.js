'use strict';

/**
 * Alert service — evaluates alert rules after each log batch is saved.
 *
 * Called by the log worker via the appEvents event bus after a batch
 * is written to MongoDB. Kept separate from the worker to allow
 * independent testing and reuse in Phase 2 APIs.
 */

const http  = require('http');
const https = require('https');
const { Buffer } = require('buffer');

const AlertRule = require('../models/AlertRule');
const Alert     = require('../models/Alert');
const Log       = require('../models/Log');
const { appEvents, EVENTS } = require('../utils/events');
const logger = require('../utils/logger');

/**
 * Evaluates all enabled alert rules for a given project.
 * Called after every log batch is persisted.
 *
 * @param {string} projectId
 */
async function evaluateRules(projectId) {
  const rules = await AlertRule.find({ projectId, enabled: true }).lean();
  if (rules.length === 0) return;

  // Evaluate all rules in parallel — failures in one don't block others
  await Promise.allSettled(
    rules.map((rule) => evaluateSingleRule(projectId, rule))
  );
}

/**
 * Evaluates a single alert rule and fires an alert if the threshold is exceeded.
 */
async function evaluateSingleRule(projectId, rule) {
  const windowStart = new Date(Date.now() - rule.windowMinutes * 60 * 1000);
  const baseMatch = { projectId: rule.projectId, timestamp: { $gte: windowStart } };

  let triggered  = false;
  let actualValue = 0;
  let alertMsg   = '';

  // ── Error Rate ──────────────────────────────────────────────────
  if (rule.conditionType === 'error_rate') {
    const [total, errors] = await Promise.all([
      Log.countDocuments(baseMatch),
      Log.countDocuments({ ...baseMatch, level: 'error' }),
    ]);

    if (total === 0) return; // No data in window — skip

    actualValue = (errors / total) * 100;
    triggered   = actualValue >= rule.threshold;
    alertMsg    = `Error rate ${actualValue.toFixed(1)}% ≥ threshold ${rule.threshold}% `
                + `(${errors}/${total} requests in last ${rule.windowMinutes}min)`;

  // ── P95 / P99 Latency ───────────────────────────────────────────
  } else if (rule.conditionType === 'p95_latency' || rule.conditionType === 'p99_latency') {
    const pct = rule.conditionType === 'p95_latency' ? 0.95 : 0.99;
    const label = rule.conditionType === 'p95_latency' ? 'P95' : 'P99';

    const [result] = await Log.aggregate([
      { $match: { ...baseMatch, durationMs: { $exists: true, $ne: null } } },
      { $sort:  { durationMs: 1 } },
      { $group: { _id: null, durations: { $push: '$durationMs' } } },
      { $project: {
          p: { $arrayElemAt: [
            '$durations',
            { $floor: { $multiply: [{ $size: '$durations' }, pct] } }
          ]},
      }},
    ]);

    if (!result || result.p == null) return;

    actualValue = result.p;
    triggered   = actualValue >= rule.threshold;
    alertMsg    = `${label} latency ${actualValue.toFixed(0)}ms ≥ threshold ${rule.threshold}ms `
                + `(last ${rule.windowMinutes}min)`;

  // ── Request Count ───────────────────────────────────────────────
  } else if (rule.conditionType === 'request_count') {
    actualValue = await Log.countDocuments(baseMatch);
    triggered   = actualValue >= rule.threshold;
    alertMsg    = `Request count ${actualValue} ≥ threshold ${rule.threshold} `
                + `in last ${rule.windowMinutes}min`;
  }

  if (!triggered) return;

  // ── Deduplication: avoid alert spam ────────────────────────────
  // Only fire a new alert if there's no unresolved alert for this rule in the current window
  const existing = await Alert.findOne({
    ruleId:   rule._id,
    resolved: false,
    createdAt: { $gte: windowStart },
  });
  if (existing) return;

  // ── Create the alert ────────────────────────────────────────────
  const alert = await Alert.create({
    projectId,
    ruleId:    rule._id,
    ruleName:  rule.name,
    message:   alertMsg,
    value:     actualValue,
    threshold: rule.threshold,
  });

  logger.warn(`🚨 ALERT [${rule.name}]: ${alertMsg}`);

  // Notify via EventEmitter (SSE handler in Phase 2 will listen)
  appEvents.emit(EVENTS.ALERT_TRIGGERED, { alert, rule });

  // Optionally call the rule's webhook URL
  if (rule.webhookUrl) {
    callWebhook(rule.webhookUrl, { alert, rule }).catch((err) =>
      logger.error(`Webhook failed for rule ${rule.name}:`, err.message)
    );
  }
}

/**
 * POSTs an alert payload to a webhook URL.
 * Uses Node's built-in http/https module — no external dependency.
 * Times out after 5 seconds.
 *
 * @param {string} url       — HTTP or HTTPS URL
 * @param {object} payload   — JSON-serializable object
 */
function callWebhook(url, payload) {
  return new Promise((resolve, reject) => {
    const body   = JSON.stringify(payload);
    const parsed = new URL(url);
    const mod    = parsed.protocol === 'https:' ? https : http;

    const req = mod.request(
      {
        hostname: parsed.hostname,
        port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path:     parsed.pathname + parsed.search,
        method:   'POST',
        headers: {
          'Content-Type':   'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent':     'TraceNest-Alerter/1.0',
        },
      },
      (res) => {
        res.resume(); // Drain and discard the response body
        resolve(res.statusCode);
      }
    );

    req.setTimeout(5000, () => {
      req.destroy(new Error('Webhook request timed out after 5s'));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { evaluateRules };
