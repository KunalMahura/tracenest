'use strict';

const { EventEmitter } = require('events');

/**
 * Application-wide event bus.
 *
 * Decouples components:
 *   - The log worker emits LOG_BATCH_SAVED after writing to MongoDB
 *   - The alert service listens and evaluates rules
 *   - The SSE handler (Phase 2) can listen and push to connected clients
 *
 * This avoids tight coupling: the worker doesn't import alertService directly.
 */
class AppEvents extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(30); // Multiple listeners for a single event are expected
  }
}

/** Singleton event bus for the whole process */
const appEvents = new AppEvents();

/**
 * Event name constants — use these instead of raw strings everywhere.
 * Prevents typo bugs.
 */
const EVENTS = {
  LOG_BATCH_SAVED:  'log:batch:saved',   // Worker saved a batch; payload: { projectId, count }
  ALERT_TRIGGERED:  'alert:triggered',   // An alert rule fired; payload: { alert, rule }
  ALERT_RESOLVED:   'alert:resolved',    // An alert was resolved; payload: { alert }
};

// ── Cross-process bridge (Redis Pub/Sub) ────────────────────────────
// The worker and the API run as separate processes (separate services on
// Railway). Events the worker emits — saved batches, fired alerts — must
// reach the API process, where the SSE live-feed clients are connected.

const BRIDGE_CHANNEL = 'tracenest:events';
const BRIDGED_EVENTS = [EVENTS.LOG_BATCH_SAVED, EVENTS.ALERT_TRIGGERED, EVENTS.ALERT_RESOLVED];

/**
 * Worker side: forward bridged events to Redis.
 * @param {import('ioredis').Redis} redis — a normal (non-subscriber) connection
 */
function publishEventsToRedis(redis) {
  for (const event of BRIDGED_EVENTS) {
    appEvents.on(event, (payload) => {
      redis.publish(BRIDGE_CHANNEL, JSON.stringify({ event, payload })).catch(() => {});
    });
  }
}

/**
 * API side: re-emit events published by the worker on the local bus.
 * @param {import('ioredis').Redis} subscriber — a DEDICATED connection (enters subscriber mode)
 * @param {{ error: Function }} logger
 */
async function subscribeEventsFromRedis(subscriber, logger) {
  subscriber.on('message', (channel, message) => {
    if (channel !== BRIDGE_CHANNEL) return;
    try {
      const { event, payload } = JSON.parse(message);
      if (BRIDGED_EVENTS.includes(event)) appEvents.emit(event, payload);
    } catch (err) {
      logger.error('[events] Bad bridge message:', err.message);
    }
  });
  await subscriber.subscribe(BRIDGE_CHANNEL);
}

module.exports = { appEvents, EVENTS, publishEventsToRedis, subscribeEventsFromRedis };
