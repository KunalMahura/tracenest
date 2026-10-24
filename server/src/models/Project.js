'use strict';

const mongoose = require('mongoose');
const crypto = require('crypto');

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name:        { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },

    // SHA-256 hash of the raw API key — what's stored in the DB
    // The raw key is never persisted; shown to the user once on creation
    apiKeyHash: { type: String, required: true, unique: true },

    // First 11 chars of raw key (e.g. "tn_a1b2c3d4") for display/identification
    apiKeyPrefix: { type: String, required: true },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ── Serialization ──────────────────────────────────────────────────
projectSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.apiKeyHash; // Never expose the hash
    delete ret.__v;
    return ret;
  },
});

// ── Static: generate a new API key ────────────────────────────────
/**
 * Creates a cryptographically random API key.
 * @returns {{ rawKey: string, hash: string, prefix: string }}
 *   rawKey  — full key shown to user once (e.g. "tn_a1b2c3d4e5...")
 *   hash    — SHA-256 hash stored in DB
 *   prefix  — first 11 chars for display (e.g. "tn_a1b2c3d4")
 */
projectSchema.statics.generateApiKey = function () {
  const raw    = crypto.randomBytes(24).toString('hex'); // 48 hex chars
  const rawKey = `tn_${raw}`;
  const hash   = crypto.createHash('sha256').update(rawKey).digest('hex');
  const prefix = rawKey.slice(0, 11); // "tn_" + 8 chars
  return { rawKey, hash, prefix };
};

// ── Static: look up project by raw API key ────────────────────────
/**
 * Hashes the provided raw key and queries for a matching active project.
 * This is the main auth check on ingest routes.
 */
projectSchema.statics.findByApiKey = function (rawKey) {
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
  return this.findOne({ apiKeyHash: hash, isActive: true });
};

module.exports = mongoose.model('Project', projectSchema);
