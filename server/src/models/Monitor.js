'use strict';

const mongoose = require('mongoose');

/**
 * Monitor — a public URL that TraceNest pings on a schedule (no SDK needed).
 *
 * Each check updates the "last*" snapshot fields here and writes one Log
 * document into the monitor's project, so results show up in the Log
 * Explorer, Live Feed, analytics and alert rules like any other traffic.
 */
const monitorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
      validate: {
        validator: (v) => /^https?:\/\//i.test(v),
        message: 'URL must start with http:// or https://',
      },
    },
    intervalMinutes: { type: Number, enum: [1, 5, 15], default: 5 },
    enabled:         { type: Boolean, default: true },

    // ── Latest check snapshot ─────────────────────────────────────
    lastStatus:     { type: String, enum: ['up', 'down', 'pending'], default: 'pending' },
    lastStatusCode: { type: Number, default: null },
    lastLatencyMs:  { type: Number, default: null },
    lastError:      { type: String, default: '' },
    lastCheckedAt:  { type: Date, default: null },

    // When the scheduler should next pick this monitor up
    nextCheckAt: { type: Date, default: Date.now, index: true },

    // ── Counters (uptime % = successfulChecks / totalChecks) ──────
    totalChecks:      { type: Number, default: 0 },
    successfulChecks: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Scheduler query: enabled monitors that are due
monitorSchema.index({ enabled: 1, nextCheckAt: 1 });

/** Uptime percentage rounded to 2 decimals, or null before the first check. */
monitorSchema.statics.computeUptime = function (m) {
  if (!m.totalChecks) return null;
  return Math.round((m.successfulChecks / m.totalChecks) * 10000) / 100;
};

module.exports = mongoose.model('Monitor', monitorSchema);
