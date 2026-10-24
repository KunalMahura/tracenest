'use strict';

const mongoose = require('mongoose');

/**
 * Alert — a record of a fired alert rule instance.
 *
 * Created by the alert service when a rule's condition is met.
 * Can be manually resolved via the API/dashboard.
 */
const alertSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AlertRule',
    },

    // Snapshot of the rule name at time of firing (rule might be renamed later)
    ruleName: { type: String },

    // Human-readable description of what triggered this alert
    message: { type: String, required: true },

    // The actual metric value at time of firing (e.g. 15.3 for 15.3% error rate)
    value: { type: Number },

    // Threshold that was exceeded
    threshold: { type: Number },

    // Whether this alert has been manually resolved
    resolved:   { type: Boolean, default: false },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

// Query pattern: list alerts for a project, newest first
alertSchema.index({ projectId: 1, createdAt: -1 });

// Quick lookup of unresolved alerts for a rule (to avoid alert spam)
alertSchema.index({ ruleId: 1, resolved: 1 });

module.exports = mongoose.model('Alert', alertSchema);
