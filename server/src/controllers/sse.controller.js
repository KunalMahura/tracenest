'use strict';

/**
 * sse.controller.js — Server-Sent Events for real-time log tailing & alert push.
 *
 * GET /api/sse/events?projectId=<id>
 *
 * The client connects once and receives a stream of:
 *   event: log        — a new log entry was saved by the worker
 *   event: alert      — an alert rule was triggered
 *   event: heartbeat  — keepalive every 25s (prevents proxy timeouts)
 *
 * Architecture:
 *   - The log worker emits LOG_BATCH_SAVED on appEvents
 *   - The alert service emits ALERT_TRIGGERED on appEvents
 *   - This handler listens to both and fans out to connected clients
 *
 * The client registry is a plain Map<projectId, Set<res>> — no Redis needed
 * for single-node dev; this can be replaced with Redis Pub/Sub for multi-node prod.
 */

const mongoose  = require('mongoose');
const Project   = require('../models/Project');
const Log       = require('../models/Log');
const { appEvents, EVENTS } = require('../utils/events');
const logger    = require('../utils/logger');

/** Map<projectId(string) → Set<SSEClient>> */
const clients = new Map();

/**
 * SSE client record
 * @typedef {{ res: import('express').Response, projectId: string }} SSEClient
 */

/**
 * Registers an SSE client for a project. Pushes recent events first,
 * then keeps the connection alive.
 */
async function connectSSE(req, res, next) {
  try {
    const { projectId } = req.query;

    if (!projectId || !mongoose.isValidObjectId(projectId)) {
      return res.status(400).json({ success: false, error: 'Valid projectId is required' });
    }

    // Ownership check — the user must own this project
    const project = await Project.findOne({ _id: projectId, userId: req.user.userId });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    // ── SSE headers ────────────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();                         // Send headers immediately

    // ── Helper: write a single SSE event ──────────────────────────
    const send = (event, data) => {
      try {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        if (typeof res.flush === 'function') res.flush(); // compression middleware compat
      } catch (_) {
        // Client disconnected — will be cleaned up below
      }
    };

    // ── Send the last 20 logs immediately on connect ───────────────
    const pid = mongoose.Types.ObjectId.createFromHexString(projectId);
    const recentLogs = await Log.find({ projectId: pid })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();
    recentLogs.reverse().forEach((log) => send('log', log));

    // ── Welcome message ────────────────────────────────────────────
    send('connected', { message: `Streaming logs for project "${project.name}"`, projectId });

    // ── Register the client ─────────────────────────────────────────
    if (!clients.has(projectId)) clients.set(projectId, new Set());
    const projectClients = clients.get(projectId);
    const client = { res, send };
    projectClients.add(client);
    logger.info(`[sse] Client connected for project ${projectId}. Total: ${projectClients.size}`);

    // ── Heartbeat timer (every 25s) ────────────────────────────────
    const heartbeat = setInterval(() => {
      send('heartbeat', { ts: new Date().toISOString() });
    }, 25000);

    // ── Cleanup on disconnect ──────────────────────────────────────
    req.on('close', () => {
      clearInterval(heartbeat);
      projectClients.delete(client);
      if (projectClients.size === 0) clients.delete(projectId);
      logger.info(`[sse] Client disconnected from project ${projectId}. Remaining: ${projectClients.size}`);
    });

  } catch (err) {
    next(err);
  }
}

// ── Fan-out: broadcast to all clients for a project ─────────────────

function broadcastToProject(projectId, event, data) {
  const projectClients = clients.get(String(projectId));
  if (!projectClients || projectClients.size === 0) return;

  for (const client of projectClients) {
    client.send(event, data);
  }
}

// ── Wire up event-bus listeners ─────────────────────────────────────

// When the worker saves a log batch, fetch the latest log and stream it
appEvents.on(EVENTS.LOG_BATCH_SAVED, async ({ projectId, count }) => {
  try {
    const pid  = mongoose.Types.ObjectId.createFromHexString(String(projectId));
    const logs = await Log.find({ projectId: pid })
      .sort({ timestamp: -1 })
      .limit(count > 10 ? 10 : count) // Stream the most recent N
      .lean();

    logs.reverse().forEach((log) =>
      broadcastToProject(String(projectId), 'log', log)
    );
  } catch (err) {
    logger.error('[sse] Error broadcasting log batch:', err.message);
  }
});

appEvents.on(EVENTS.ALERT_TRIGGERED, ({ alert, rule }) => {
  broadcastToProject(String(alert.projectId), 'alert', { alert, rule });
});

module.exports = { connectSSE };
