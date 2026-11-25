'use strict';

/**
 * TraceNest SDK — zero-dependency monitoring for Node.js apps.
 *
 * EXPRESS (2 lines):
 *   const { tracenest } = require('@tracenest/sdk');
 *   app.use(tracenest({ apiKey: process.env.TRACENEST_API_KEY, host: 'https://your-api.example.com' }));
 *
 * PLAIN node:http:
 *   const { createClient } = require('@tracenest/sdk');
 *   const tn = createClient({ apiKey, host });
 *   http.createServer(tn.wrap((req, res) => { ... })).listen(3000);
 *
 * ANY EVENT (workers, cron jobs, CLIs, Fastify, Koa, Next.js API routes...):
 *   tn.info('User signed up', { userId });
 *   tn.capture({ level: 'warn', message: 'Slow query', durationMs: 812, endpoint: 'db:users.find' });
 *   tn.captureException(err, { orderId });
 *
 * DESIGN:
 *   - Zero dependencies — Node.js core http/https only
 *   - Logs are buffered in memory and sent in batches (never blocks your requests)
 *   - Network failures are retried on the next flush; the buffer is capped so a
 *     TraceNest outage can never exhaust your app's memory
 *   - Rejections from the API (bad key, quota exceeded) are dropped, not retried
 *   - Never throws from logging calls; never installs signal handlers
 */

const http  = require('http');
const https = require('https');

const SDK_VERSION = '1.1.0';
const LEVELS      = new Set(['debug', 'info', 'warn', 'error']);
const MAX_BATCH   = 1000; // Server-side limit per request

const DEFAULTS = {
  host:          'http://localhost:3000',
  flushInterval: 5000,   // ms between automatic flushes
  batchSize:     50,     // flush early once this many logs are buffered
  maxBufferSize: 10000,  // drop oldest logs beyond this (protects host app memory)
  timeout:       5000,   // HTTP request timeout in ms
  debug:         false,
  enabled:       true,
  ignorePaths:   ['/health', '/healthz', '/favicon.ico'],
};

function envVar(name) {
  return typeof process !== 'undefined' && process.env ? process.env[name] : undefined;
}

function levelForStatus(statusCode) {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  return 'info';
}

/** Strips the query string from a URL path. */
function pathOf(url) {
  if (!url) return '/';
  const q = url.indexOf('?');
  return q === -1 ? url : url.slice(0, q);
}

/** Express route template (/users/:id) when available — groups analytics nicely. */
function routeOf(req) {
  if (req.route && typeof req.route.path === 'string') {
    return (req.baseUrl || '') + req.route.path;
  }
  return pathOf(req.originalUrl || req.url);
}

// ── Core client ────────────────────────────────────────────────────

class TraceNestClient {
  /**
   * @param {import('./index').TraceNestOptions} [opts]
   */
  constructor(opts = {}) {
    this._apiKey = opts.apiKey || envVar('TRACENEST_API_KEY');
    if (!this._apiKey) {
      throw new Error('[TraceNest] apiKey is required (pass { apiKey } or set TRACENEST_API_KEY)');
    }

    this._host          = String(opts.host || envVar('TRACENEST_HOST') || DEFAULTS.host).replace(/\/+$/, '');
    this._projectId     = opts.projectId || envVar('TRACENEST_PROJECT_ID'); // informational only — the key identifies the project
    this._service       = opts.service || envVar('TRACENEST_SERVICE');
    this._environment   = opts.environment || envVar('NODE_ENV');
    this._batchSize     = Math.min(opts.batchSize || DEFAULTS.batchSize, MAX_BATCH);
    this._maxBufferSize = opts.maxBufferSize || DEFAULTS.maxBufferSize;
    this._timeout       = opts.timeout || DEFAULTS.timeout;
    this._debug         = Boolean(opts.debug);
    this._enabled       = opts.enabled !== undefined ? Boolean(opts.enabled) : DEFAULTS.enabled;
    this._ignorePaths   = opts.ignorePaths || DEFAULTS.ignorePaths;
    this._onError       = typeof opts.onError === 'function' ? opts.onError : null;

    this._buffer   = [];
    this._inflight = null; // Promise of the current flush, if any
    this._dropped  = 0;
    this._lastQuota = null;
    this._stopped  = false;

    const url = new URL(this._host);
    this._transport = url.protocol === 'https:' ? https : http;
    this._agent     = new this._transport.Agent({ keepAlive: true, maxSockets: 4 });

    this._timer = setInterval(() => { this.flush(); }, opts.flushInterval || opts.flushEvery || DEFAULTS.flushInterval);
    if (typeof this._timer.unref === 'function') this._timer.unref(); // never keep the process alive

    // Best-effort final flush when the event loop drains naturally.
    // We deliberately do NOT listen for SIGINT/SIGTERM: adding a listener
    // disables Node's default exit behaviour in the host app.
    this._onBeforeExit = () => { this.flush(); };
    process.once('beforeExit', this._onBeforeExit);
  }

  // ── Logging API ─────────────────────────────────────────────────

  /**
   * Records any structured event. All fields except message are optional.
   * @param {import('./index').LogEvent} event
   */
  capture(event = {}) {
    if (!this._enabled || this._stopped) return;
    try {
      const entry = {
        level:     LEVELS.has(event.level) ? event.level : 'info',
        message:   String(event.message ?? '').slice(0, 5000) || 'No message',
        timestamp: event.timestamp ? new Date(event.timestamp).toISOString() : new Date().toISOString(),
      };
      if (event.method)                 entry.method     = String(event.method).toUpperCase();
      if (event.endpoint)               entry.endpoint   = String(event.endpoint);
      if (event.statusCode != null)     entry.statusCode = Number(event.statusCode);
      if (event.durationMs != null)     entry.durationMs = Number(event.durationMs);
      if (event.stack)                  entry.stack      = String(event.stack);

      const meta = { ...(event.meta || {}) };
      if (this._service && meta.service === undefined)         meta.service = this._service;
      if (this._environment && meta.environment === undefined) meta.environment = this._environment;
      if (Object.keys(meta).length) entry.meta = meta;

      this._buffer.push(entry);

      if (this._buffer.length > this._maxBufferSize) {
        const overflow = this._buffer.length - this._maxBufferSize;
        this._buffer.splice(0, overflow);
        this._dropped += overflow;
      }
      if (this._buffer.length >= this._batchSize) this.flush();
    } catch (err) {
      this._dbg(`capture failed: ${err.message}`);
    }
  }

  /**
   * @param {'debug'|'info'|'warn'|'error'} level
   * @param {string} message
   * @param {object} [meta]
   */
  log(level, message, meta) {
    this.capture({ level, message, meta });
  }

  debug(message, meta) { this.capture({ level: 'debug', message, meta }); }
  info(message, meta)  { this.capture({ level: 'info',  message, meta }); }
  warn(message, meta)  { this.capture({ level: 'warn',  message, meta }); }
  error(message, meta) { this.capture({ level: 'error', message, meta }); }

  /** Records an Error (or anything thrown) at level "error", including its stack. */
  captureException(err, meta) {
    const e = err instanceof Error ? err : new Error(String(err));
    this.capture({ level: 'error', message: `${e.name}: ${e.message}`, stack: e.stack, meta });
  }

  // ── HTTP instrumentation ────────────────────────────────────────

  /**
   * Times one HTTP request/response pair and records it when the response
   * finishes. Works with node:http, Express, Connect, Koa (ctx.req/ctx.res),
   * Fastify (request.raw/reply.raw) — anything built on Node's http module.
   */
  trackRequest(req, res) {
    if (!this._enabled || !req || !res) return;
    const path = pathOf(req.originalUrl || req.url);
    if (this._ignorePaths.includes(path)) return;

    const start = process.hrtime.bigint();
    let recorded = false;

    const record = (aborted) => {
      if (recorded) return;
      recorded = true;
      const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
      const statusCode = aborted && !res.headersSent ? 499 : res.statusCode;
      const endpoint   = routeOf(req);
      const meta = {};
      if (aborted) meta.aborted = true;
      if (req._tracenestError) meta.error = req._tracenestError;

      this.capture({
        level:      levelForStatus(statusCode),
        message:    `${req.method} ${endpoint} ${statusCode}`,
        method:     req.method,
        endpoint,
        statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        meta,
      });
    };

    res.once('finish', () => record(false));
    res.once('close',  () => record(!res.writableFinished));
  }

  /**
   * Wraps a plain node:http request handler.
   *   http.createServer(client.wrap((req, res) => { ... }))
   */
  wrap(handler) {
    const client = this;
    return function tracenestWrapped(req, res) {
      client.trackRequest(req, res);
      try {
        const out = handler.apply(this, arguments);
        if (out && typeof out.catch === 'function') {
          out.catch((err) => { client.captureException(err, { endpoint: pathOf(req.url) }); throw err; });
        }
        return out;
      } catch (err) {
        client.captureException(err, { endpoint: pathOf(req.url) });
        throw err;
      }
    };
  }

  /** Express/Connect middleware that records every request. */
  middleware() {
    const client = this;
    return function tracenestMiddleware(req, res, next) {
      client.trackRequest(req, res);
      next();
    };
  }

  /**
   * Express error-handling middleware: records the error with its stack,
   * then passes it on to your own error handler. Register AFTER your routes.
   */
  errorHandler() {
    const client = this;
    // Express identifies error handlers by arity — keep all four params.
    return function tracenestErrorHandler(err, req, _res, next) {
      if (req) req._tracenestError = err && err.message;
      client.captureException(err, {
        method:   req && req.method,
        endpoint: req ? routeOf(req) : undefined,
      });
      next(err);
    };
  }

  // ── Delivery ────────────────────────────────────────────────────

  /**
   * Sends buffered logs now. Resolves once the batch has been sent (or failed).
   * Never rejects.
   * @returns {Promise<void>}
   */
  flush() {
    if (this._inflight) return this._inflight;
    if (this._buffer.length === 0) return Promise.resolve();

    const batch = this._buffer.splice(0, MAX_BATCH);

    this._inflight = this._post('/api/ingest/batch', { logs: batch })
      .then((res) => {
        this._dbg(`flushed ${batch.length} log(s)`);
        this._lastQuota = res.quota;
      })
      .catch((err) => {
        if (err.retryable) {
          // Network error / 5xx — put the logs back (bounded by maxBufferSize)
          this._buffer.unshift(...batch);
          if (this._buffer.length > this._maxBufferSize) {
            const overflow = this._buffer.length - this._maxBufferSize;
            this._buffer.splice(0, overflow);
            this._dropped += overflow;
          }
        } else {
          // 4xx (invalid key, quota exceeded, bad payload) — retrying won't help
          this._dropped += batch.length;
        }
        this._dbg(`flush failed (${err.retryable ? 'will retry' : 'dropped'}): ${err.message}`);
        if (this._onError) {
          try { this._onError(err); } catch (_) { /* ignore */ }
        }
      })
      .then(() => {
        this._inflight = null;
        // Keep draining if a lot is still queued
        if (this._buffer.length >= this._batchSize && !this._stopped) return this.flush();
        return undefined;
      });

    return this._inflight;
  }

  /**
   * Stops the timer and sends everything still buffered. Call on shutdown:
   *   process.on('SIGTERM', async () => { await client.shutdown(); process.exit(0); });
   * @returns {Promise<void>}
   */
  async shutdown() {
    clearInterval(this._timer);
    process.removeListener('beforeExit', this._onBeforeExit);
    // Drain the buffer (bounded number of attempts so shutdown always finishes)
    for (let i = 0; i < 20 && (this._buffer.length > 0 || this._inflight); i++) {
      const before = this._buffer.length;
      await this.flush();
      if (this._buffer.length >= before && !this._inflight) break; // no progress (API down)
    }
    this._stopped = true;
    this._agent.destroy();
  }

  /** Diagnostics: buffered/dropped counts and the last quota the API reported. */
  stats() {
    return { buffered: this._buffer.length, dropped: this._dropped, quota: this._lastQuota };
  }

  _post(path, body) {
    return new Promise((resolve, reject) => {
      let payload;
      try {
        payload = JSON.stringify(body);
      } catch (err) {
        err.retryable = false;
        return reject(err);
      }

      const url = new URL(this._host + path);
      const req = this._transport.request(
        {
          protocol: url.protocol,
          hostname: url.hostname,
          port:     url.port || (url.protocol === 'https:' ? 443 : 80),
          path:     url.pathname + url.search,
          method:   'POST',
          agent:    this._agent,
          headers: {
            'Content-Type':   'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'X-API-Key':      this._apiKey,
            'User-Agent':     `tracenest-node/${SDK_VERSION}`,
          },
        },
        (res) => {
          let raw = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => { raw += chunk; });
          res.on('end', () => {
            let json = null;
            try { json = JSON.parse(raw); } catch (_) { /* non-JSON */ }

            if (res.statusCode >= 200 && res.statusCode < 300) {
              return resolve((json && json.data) || {});
            }
            const err = new Error(
              `TraceNest API ${res.statusCode}: ${(json && json.error) || raw.slice(0, 200)}`
            );
            err.statusCode = res.statusCode;
            err.retryable  = res.statusCode >= 500 || res.statusCode === 408;
            reject(err);
          });
        }
      );

      req.setTimeout(this._timeout, () => {
        req.destroy(new Error(`request timed out after ${this._timeout}ms`));
      });
      req.on('error', (err) => {
        err.retryable = true;
        reject(err);
      });
      req.end(payload);
    });
  }

  _dbg(msg) {
    if (this._debug) process.stderr.write(`[TraceNest] ${msg}\n`);
  }
}

// ── Factories & module-level convenience API ───────────────────────

/** Creates a standalone client. */
function createClient(opts = {}) {
  return new TraceNestClient(opts);
}

/**
 * Express/Connect middleware factory (the original 1.0 API).
 *   app.use(tracenest({ apiKey, host }))
 * The underlying client is available as middleware.client, e.g. for
 * app.use(mw.client.errorHandler()) or mw.client.info('...').
 */
function tracenest(opts = {}) {
  const client = opts instanceof TraceNestClient ? opts : new TraceNestClient(opts);
  const mw = client.middleware();
  mw.client = client;
  return mw;
}

let defaultClient = null;

/** Initialises the shared default client used by the top-level helpers. */
function init(opts = {}) {
  if (defaultClient) defaultClient.shutdown();
  defaultClient = new TraceNestClient(opts);
  return defaultClient;
}

function getClient() {
  return defaultClient;
}

function requireDefault() {
  if (!defaultClient) {
    throw new Error('[TraceNest] call init({ apiKey, host }) before using the top-level helpers');
  }
  return defaultClient;
}

module.exports = {
  tracenest,
  createClient,
  init,
  getClient,
  TraceNestClient,
  SDK_VERSION,

  // Top-level helpers bound to the default client (after init())
  capture:          (event)       => requireDefault().capture(event),
  log:              (lvl, m, mt)  => requireDefault().log(lvl, m, mt),
  debug:            (m, mt)       => requireDefault().debug(m, mt),
  info:             (m, mt)       => requireDefault().info(m, mt),
  warn:             (m, mt)       => requireDefault().warn(m, mt),
  error:            (m, mt)       => requireDefault().error(m, mt),
  captureException: (err, mt)     => requireDefault().captureException(err, mt),
  flush:            ()            => (defaultClient ? defaultClient.flush() : Promise.resolve()),
  shutdown:         ()            => (defaultClient ? defaultClient.shutdown() : Promise.resolve()),
};
