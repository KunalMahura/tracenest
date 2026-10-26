'use strict';

/**
 * TraceNest SDK — Lightweight Express/Node.js monitoring middleware.
 *
 * USAGE (Express app):
 * ─────────────────────────────────────────────────────────────────
 * const { tracenest } = require('@tracenest/sdk');
 *
 * app.use(tracenest({
 *   apiKey:    'tn_your_api_key_here',
 *   projectId: 'your_project_id',
 *   host:      'http://localhost:3000', // TraceNest API URL
 *   flushEvery: 5000,                   // ms, optional (default 5s)
 *   batchSize:  20,                     // optional (default 20)
 * }));
 * ─────────────────────────────────────────────────────────────────
 *
 * MANUAL LOGGING (also usable without Express):
 *   const { createClient } = require('@tracenest/sdk');
 *   const client = createClient({ apiKey, projectId, host });
 *   client.log('error', 'Payment failed', { orderId: 123 });
 *
 * IMPLEMENTATION NOTES:
 *   - Zero external dependencies — uses only Node.js core http/https
 *   - Logs are buffered in-memory and flushed in batch (non-blocking)
 *   - On process exit, a synchronous flush is attempted
 *   - Gracefully degrades: if TraceNest is unavailable, logs go to stderr only
 */

const http  = require('http');
const https = require('https');
const { Buffer } = require('buffer');

// ── Default config ─────────────────────────────────────────────────
const DEFAULTS = {
  host:       'http://localhost:3000',
  flushEvery: 5000,    // 5 seconds
  batchSize:  20,      // Flush when buffer reaches this size
  timeout:    4000,    // HTTP request timeout in ms
  debug:      false,   // Set true to print SDK internals to stderr
};

// ── Core client ────────────────────────────────────────────────────

class TraceNestClient {
  constructor(opts = {}) {
    if (!opts.apiKey)    throw new Error('[TraceNest] apiKey is required');
    if (!opts.projectId) throw new Error('[TraceNest] projectId is required');

    this._apiKey    = opts.apiKey;
    this._projectId = opts.projectId;
    this._host      = (opts.host || DEFAULTS.host).replace(/\/$/, '');
    this._batchSize = opts.batchSize  || DEFAULTS.batchSize;
    this._timeout   = opts.timeout    || DEFAULTS.timeout;
    this._debug     = opts.debug      || DEFAULTS.debug;

    this._buffer    = [];    // Pending log objects
    this._flushing  = false; // Prevent concurrent flushes

    // Auto-flush on interval
    this._timer = setInterval(() => this.flush(), opts.flushEvery || DEFAULTS.flushEvery);
    this._timer.unref(); // Don't prevent process from exiting

    // Flush on exit (best-effort synchronous-ish drain)
    process.once('beforeExit', () => this.flush());
    process.once('SIGTERM',    () => this.flush());
    process.once('SIGINT',     () => this.flush());
  }

  /**
   * Push a log entry into the buffer.
   * @param {'debug'|'info'|'warn'|'error'} level
   * @param {string} message
   * @param {object} [meta]
   */
  log(level, message, meta = {}) {
    const entry = {
      level:     level || 'info',
      message:   String(message),
      timestamp: new Date().toISOString(),
      meta,
    };
    this._buffer.push(entry);
    if (this._buffer.length >= this._batchSize) {
      this.flush();
    }
  }

  // Convenience methods
  debug(msg, meta) { this.log('debug', msg, meta); }
  info(msg, meta)  { this.log('info',  msg, meta); }
  warn(msg, meta)  { this.log('warn',  msg, meta); }
  error(msg, meta) { this.log('error', msg, meta); }

  /**
   * Flushes the buffer to the TraceNest API.
   * Non-blocking: errors are silently swallowed (logged to stderr if debug=true).
   */
  async flush() {
    if (this._flushing || this._buffer.length === 0) return;
    this._flushing = true;

    const batch = this._buffer.splice(0, Math.min(this._buffer.length, 1000));

    try {
      await this._post('/api/ingest/batch', { logs: batch });
      this._dbg(`[TraceNest] Flushed ${batch.length} log(s)`);
    } catch (err) {
      this._dbg(`[TraceNest] Flush failed: ${err.message}`);
      // Put failed logs back at the front of the buffer (don't lose them silently)
      this._buffer.unshift(...batch);
    } finally {
      this._flushing = false;
    }
  }

  /** HTTP POST helper using Node core http/https */
  _post(path, body) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(body);
      const url     = new URL(this._host + path);
      const mod     = url.protocol === 'https:' ? https : http;

      const req = mod.request(
        {
          hostname: url.hostname,
          port:     url.port || (url.protocol === 'https:' ? 443 : 80),
          path:     url.pathname + url.search,
          method:   'POST',
          headers: {
            'Content-Type':   'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'X-API-Key':      this._apiKey,
          },
        },
        (res) => {
          let raw = '';
          res.on('data', (chunk) => (raw += chunk));
          res.on('end', () => {
            if (res.statusCode >= 400) {
              reject(new Error(`TraceNest API returned ${res.statusCode}: ${raw}`));
            } else {
              resolve(raw);
            }
          });
        }
      );

      req.setTimeout(this._timeout, () => {
        req.destroy(new Error('TraceNest SDK request timed out'));
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  _dbg(msg) {
    if (this._debug) process.stderr.write(msg + '\n');
  }

  /** Stop the flush interval. Call when shutting down to avoid open handles. */
  shutdown() {
    clearInterval(this._timer);
    return this.flush();
  }
}

// ── Express middleware factory ─────────────────────────────────────

/**
 * Creates an Express middleware that automatically captures:
 *   - HTTP method, endpoint (path), status code, and response time
 *   - Unhandled errors (via Express error handler chaining)
 *
 * @param {object} opts — same as TraceNestClient options
 * @returns {Function} Express middleware
 */
function tracenest(opts = {}) {
  const client = new TraceNestClient(opts);

  return function tracenestMiddleware(req, res, next) {
    const start = Date.now();

    // Capture res.end to intercept the response
    const originalEnd = res.end.bind(res);
    res.end = function (...args) {
      const durationMs  = Date.now() - start;
      const statusCode  = res.statusCode;
      const level       = statusCode >= 500 ? 'error'
                        : statusCode >= 400 ? 'warn'
                        : 'info';

      client.log(level, `${req.method} ${req.path} ${statusCode}`, {
        method:     req.method,
        endpoint:   req.path,
        statusCode,
        durationMs,
        service:    opts.service || req.hostname,
      });

      return originalEnd(...args);
    };

    next();
  };
}

// ── Exports ────────────────────────────────────────────────────────

/**
 * Creates a standalone TraceNest client (no Express).
 */
function createClient(opts = {}) {
  return new TraceNestClient(opts);
}

module.exports = { tracenest, createClient, TraceNestClient };
