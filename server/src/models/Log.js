'use strict';

const mongoose = require('mongoose');
const env = require('../config/env');

/**
 * Log schema — the core data model of TraceNest.
 *
 * Each document represents one request or application event captured
 * from a monitored app via the ingest API.
 */
const logSchema = new mongoose.Schema(
  {
    projectId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    timestamp:  { type: Date, required: true, default: Date.now },

    // Log severity level
    level: {
      type:    String,
      enum:    ['debug', 'info', 'warn', 'error'],
      default: 'info',
    },

    message:    { type: String, required: true, maxlength: 5000 },
    method:     { type: String, maxlength: 10 },   // GET, POST, PUT, DELETE, etc.
    endpoint:   { type: String, maxlength: 500 },  // e.g. /api/users/:id
    statusCode: { type: Number },                  // HTTP status code
    durationMs: { type: Number },                  // Request duration in milliseconds
    stack:      { type: String, maxlength: 10000 }, // Error stack trace
    meta:       { type: mongoose.Schema.Types.Mixed }, // Any extra structured data

    // TTL field — MongoDB's TTL index will delete docs when expiresAt < now
    expiresAt:  { type: Date, required: true },
  },
  {
    versionKey: false, // Remove __v field — we don't need optimistic locking here
    // Don't create a createdAt/updatedAt — timestamp is the source of truth
  }
);

// ── Indexes ────────────────────────────────────────────────────────
// These cover all query patterns used by the search and analytics APIs.

// Primary query: filter by project + sort by time (used on every dashboard view)
logSchema.index({ projectId: 1, timestamp: -1 });

// Error rate queries: filter by project + level + time
logSchema.index({ projectId: 1, level: 1, timestamp: -1 });

// Endpoint analytics: group by endpoint, filter by project + time
logSchema.index({ projectId: 1, endpoint: 1, timestamp: -1 });

// Status code queries: filter by project + statusCode
logSchema.index({ projectId: 1, statusCode: 1, timestamp: -1 });

// Full-text search on message field
logSchema.index({ message: 'text' });

// TTL index: MongoDB automatically deletes documents once expiresAt is in the past
// expireAfterSeconds: 0 means "delete at the timestamp stored in expiresAt"
logSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ── Static helpers ─────────────────────────────────────────────────
/**
 * Computes the TTL expiry date for a new log document.
 * Based on LOG_TTL_DAYS from environment config.
 */
logSchema.statics.makeExpiresAt = function () {
  const d = new Date();
  d.setDate(d.getDate() + env.LOG_TTL_DAYS);
  return d;
};

module.exports = mongoose.model('Log', logSchema);
