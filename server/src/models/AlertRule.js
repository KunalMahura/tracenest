'use strict';

const mongoose = require('mongoose');

/**
 * AlertRule — defines a condition that should trigger an alert.
 *
 * Example rules:
 *   - "Error rate > 10% in the last 5 minutes"
 *   - "P95 latency > 2000ms in the last 10 minutes"
 */
const alertRuleSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },

    // What metric to evaluate
    conditionType: {
      type: String,
      enum: ['error_rate', 'p95_latency', 'p99_latency', 'request_count'],
      required: true,
    },

    // The value that, when exceeded, triggers the alert
    // For error_rate: percentage (0-100)
    // For latency types: milliseconds
    // For request_count: count per window
    threshold: { type: Number, required: true },

    // Rolling time window in minutes to evaluate the condition over
    windowMinutes: { type: Number, default: 5, min: 1, max: 1440 },

    // Optional webhook URL to POST alert payload to (e.g. Slack, Discord)
    webhookUrl: { type: String },

    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AlertRule', alertRuleSchema);
