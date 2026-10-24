'use strict';

const { EventEmitter } = require('events');

/**
 * Structured logger using Node.js core modules (EventEmitter, process.stdout/stderr).
 *
 * Features:
 *   - Level filtering (debug/info/warn/error)
 *   - ISO timestamp on every line
 *   - Emits 'log' events so other parts of the system can subscribe
 *   - Objects are JSON.stringify'd automatically
 */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

class Logger extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(20);
    this._levelThreshold = LEVELS[process.env.LOG_LEVEL || 'info'] ?? LEVELS.info;
  }

  _log(level, ...args) {
    if (LEVELS[level] < this._levelThreshold) return;

    const timestamp = new Date().toISOString();
    const levelTag = level.toUpperCase().padEnd(5);

    // Stringify objects; keep strings and primitives as-is
    const message = args
      .map((a) => (a instanceof Error ? a.stack : typeof a === 'object' ? JSON.stringify(a) : String(a)))
      .join(' ');

    const line = `[${timestamp}] [${levelTag}] ${message}\n`;

    // Errors go to stderr; everything else to stdout
    if (level === 'error') {
      process.stderr.write(line);
    } else {
      process.stdout.write(line);
    }

    // Emit so subscribers (e.g. test helpers) can assert on log output
    this.emit('log', { level, message, timestamp });
  }

  debug(...args) { this._log('debug', ...args); }
  info(...args)  { this._log('info',  ...args); }
  warn(...args)  { this._log('warn',  ...args); }
  error(...args) { this._log('error', ...args); }
}

// Export singleton — same logger instance across the whole process
module.exports = new Logger();
