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

module.exports = { appEvents, EVENTS };
