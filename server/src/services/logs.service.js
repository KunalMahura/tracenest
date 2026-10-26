'use strict';

/**
 * logs.service.js — Core query engine for the Log Explorer & Analytics APIs.
 *
 * Responsibilities:
 *   - Build optimised MongoDB query/aggregation pipelines for log searches
 *   - Keyset pagination (cursor-based) for fast scrolling through large result sets
 *   - Time-series, latency-percentile, and endpoint aggregations for analytics
 */

const Log     = require('../models/Log');
const logger  = require('../utils/logger');

// ── Time-range helper ──────────────────────────────────────────────
const RANGE_MAP = {
  '15m': 15,
  '1h':  60,
  '6h':  360,
  '24h': 1440,
  '7d':  10080,
  '30d': 43200,
};

/**
 * Resolves a named range string ("15m", "7d", etc.) OR an explicit
 * { from, to } ISO-string pair into a { $gte, $lte } Date range.
 */
function resolveTimeRange(range, from, to) {
  if (from || to) {
    const filter = {};
    if (from) filter.$gte = new Date(from);
    if (to)   filter.$lte = new Date(to);
    return filter;
  }

  const minutes = RANGE_MAP[range] || 60; // default: last hour
  return { $gte: new Date(Date.now() - minutes * 60 * 1000) };
}

// ── SEARCH API ─────────────────────────────────────────────────────

/**
 * Searches logs for a project with filtering and cursor-based pagination.
 *
 * @param {string} projectId
 * @param {object} opts
 * @param {string}  [opts.range='1h']      - Named time range
 * @param {string}  [opts.from]            - ISO start date (overrides range)
 * @param {string}  [opts.to]             - ISO end date (overrides range)
 * @param {string}  [opts.level]           - 'error' | 'warn' | 'info' | 'debug'
 * @param {string}  [opts.service]         - Regex match on endpoint or meta.service
 * @param {number}  [opts.statusCode]      - Exact HTTP status code
 * @param {string}  [opts.q]              - Full-text search string
 * @param {string}  [opts.cursor]         - Last timestamp (ISO) for keyset pagination
 * @param {number}  [opts.limit=50]       - Page size (max 200)
 * @returns {{ logs: object[], nextCursor: string|null, total: number }}
 */
async function searchLogs(projectId, opts = {}) {
  const {
    range = '1h',
    from,
    to,
    level,
    service,
    statusCode,
    q,
    cursor,
    limit: rawLimit = 50,
  } = opts;

  const limit = Math.min(Number(rawLimit) || 50, 200);

  // ── Build the $match stage ─────────────────────────────────────
  const match = {
    projectId: require('mongoose').Types.ObjectId.createFromHexString(String(projectId)),
    timestamp: resolveTimeRange(range, from, to),
  };

  if (level)      match.level = level;
  if (statusCode) match.statusCode = Number(statusCode);

  // Keyset pagination: fetch docs OLDER than the cursor timestamp
  if (cursor) {
    match.timestamp.$lte = new Date(cursor);
    // Exclude the cursor document itself (already seen)
    match._id = { $lt: require('mongoose').Types.ObjectId.createFromHexString(cursor.split('_')[1] || '000000000000000000000000') };
  }

  // Service filter — matches either the endpoint field or meta.service string
  if (service) {
    match.$or = [
      { endpoint: { $regex: service, $options: 'i' } },
      { 'meta.service': { $regex: service, $options: 'i' } },
    ];
  }

  // Full-text search on the message field
  const useTextSearch = Boolean(q && q.trim());
  if (useTextSearch) {
    delete match.timestamp; // $text + timestamp range requires special handling
    match.$text = { $search: q.trim() };
  }

  // ── Pipeline ───────────────────────────────────────────────────
  const pipeline = [{ $match: match }];

  if (useTextSearch) {
    // Restore time filter after $text match
    const timeFilter = resolveTimeRange(range, from, to);
    pipeline.push({ $match: { timestamp: timeFilter } });
    pipeline.push({ $sort: { score: { $meta: 'textScore' }, timestamp: -1 } });
  } else {
    pipeline.push({ $sort: { timestamp: -1 } });
  }

  pipeline.push({ $limit: limit + 1 }); // Fetch one extra to detect next page

  pipeline.push({
    $project: {
      _id:        1,
      timestamp:  1,
      level:      1,
      message:    1,
      method:     1,
      endpoint:   1,
      statusCode: 1,
      durationMs: 1,
      stack:      1,
      meta:       1,
    },
  });

  const [results, total] = await Promise.all([
    Log.aggregate(pipeline),
    Log.countDocuments(match),
  ]);

  const hasMore = results.length > limit;
  const logs    = hasMore ? results.slice(0, limit) : results;

  // Cursor = ISO timestamp of last returned doc
  const nextCursor = hasMore
    ? logs[logs.length - 1].timestamp.toISOString()
    : null;

  return { logs, nextCursor, total };
}

// ── ANALYTICS API ──────────────────────────────────────────────────

/**
 * Returns request throughput grouped into time buckets.
 *
 * @param {string} projectId
 * @param {string} range - named time range
 * @param {number} [buckets=30] - number of chart data points
 * @returns {Array<{ time: string, requests: number, errors: number, errorRate: number }>}
 */
async function getThroughput(projectId, range = '1h', buckets = 30) {
  const timeFilter = resolveTimeRange(range);
  const durationMs = RANGE_MAP[range] * 60 * 1000 || 3600000;
  const bucketMs   = Math.floor(durationMs / buckets);

  const pid = require('mongoose').Types.ObjectId.createFromHexString(String(projectId));

  const pipeline = [
    { $match: { projectId: pid, timestamp: timeFilter } },
    {
      $group: {
        _id: {
          $subtract: [
            { $toLong: '$timestamp' },
            { $mod: [{ $toLong: '$timestamp' }, bucketMs] },
          ],
        },
        total:  { $sum: 1 },
        errors: { $sum: { $cond: [{ $eq: ['$level', 'error'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id:       0,
        time:      { $toDate: '$_id' },
        requests:  '$total',
        errors:    '$errors',
        errorRate: {
          $round: [
            { $multiply: [{ $divide: ['$errors', '$total'] }, 100] },
            1,
          ],
        },
      },
    },
  ];

  return Log.aggregate(pipeline);
}

/**
 * Calculates p50, p95, and p99 latency percentiles over a time window.
 *
 * @param {string} projectId
 * @param {string} range
 * @returns {{ p50: number, p95: number, p99: number, avgMs: number, sampleCount: number }}
 */
async function getLatencyPercentiles(projectId, range = '1h') {
  const pid = require('mongoose').Types.ObjectId.createFromHexString(String(projectId));
  const timeFilter = resolveTimeRange(range);

  const [result] = await Log.aggregate([
    { $match: {
        projectId: pid,
        timestamp: timeFilter,
        durationMs: { $exists: true, $ne: null, $gt: 0 },
    }},
    { $sort: { durationMs: 1 } },
    { $group: {
        _id:       null,
        durations: { $push: '$durationMs' },
        avg:       { $avg: '$durationMs' },
    }},
    { $project: {
        _id:  0,
        avg:  { $round: ['$avg', 0] },
        size: { $size: '$durations' },
        p50:  { $arrayElemAt: ['$durations', { $floor: { $multiply: [{ $size: '$durations' }, 0.50] } }] },
        p95:  { $arrayElemAt: ['$durations', { $floor: { $multiply: [{ $size: '$durations' }, 0.95] } }] },
        p99:  { $arrayElemAt: ['$durations', { $floor: { $multiply: [{ $size: '$durations' }, 0.99] } }] },
    }},
  ]);

  if (!result) return { p50: 0, p95: 0, p99: 0, avgMs: 0, sampleCount: 0 };

  return {
    p50:         result.p50  || 0,
    p95:         result.p95  || 0,
    p99:         result.p99  || 0,
    avgMs:       result.avg  || 0,
    sampleCount: result.size || 0,
  };
}

/**
 * Returns the top N slowest endpoints by avg latency.
 *
 * @param {string} projectId
 * @param {string} range
 * @param {number} [n=10]
 * @returns {Array<{ endpoint: string, avgMs: number, p95: number, requests: number }>}
 */
async function getSlowestEndpoints(projectId, range = '1h', n = 10) {
  const pid = require('mongoose').Types.ObjectId.createFromHexString(String(projectId));

  const [result] = await Log.aggregate([
    { $match: {
        projectId: pid,
        timestamp: resolveTimeRange(range),
        endpoint:  { $exists: true, $ne: null },
        durationMs: { $exists: true, $ne: null },
    }},
    { $sort: { durationMs: 1 } },
    { $group: {
        _id:       '$endpoint',
        durations: { $push: '$durationMs' },
        avg:       { $avg: '$durationMs' },
        requests:  { $sum: 1 },
    }},
    { $sort: { avg: -1 } },
    { $limit: n },
    { $project: {
        _id:      0,
        endpoint: '$_id',
        avgMs:    { $round: ['$avg', 0] },
        p95:      { $arrayElemAt: ['$durations', { $floor: { $multiply: [{ $size: '$durations' }, 0.95] } }] },
        requests: 1,
    }},
  ]);

  // Flatten because aggregate returns array
  const rows = await Log.aggregate([
    { $match: {
        projectId: pid,
        timestamp: resolveTimeRange(range),
        endpoint:  { $exists: true, $ne: null },
        durationMs: { $exists: true, $ne: null },
    }},
    { $sort: { durationMs: 1 } },
    { $group: {
        _id:       '$endpoint',
        durations: { $push: '$durationMs' },
        avg:       { $avg: '$durationMs' },
        requests:  { $sum: 1 },
    }},
    { $sort: { avg: -1 } },
    { $limit: n },
    { $project: {
        _id:      0,
        endpoint: '$_id',
        avgMs:    { $round: ['$avg', 0] },
        p95:      { $arrayElemAt: ['$durations', { $floor: { $multiply: [{ $size: '$durations' }, 0.95] } }] },
        requests: 1,
    }},
  ]);

  return rows;
}

/**
 * Returns the top N endpoints by error count.
 *
 * @param {string} projectId
 * @param {string} range
 * @param {number} [n=10]
 * @returns {Array<{ endpoint: string, errors: number, total: number, errorRate: number }>}
 */
async function getTopFailingEndpoints(projectId, range = '1h', n = 10) {
  const pid = require('mongoose').Types.ObjectId.createFromHexString(String(projectId));

  return Log.aggregate([
    { $match: {
        projectId: pid,
        timestamp: resolveTimeRange(range),
        endpoint:  { $exists: true, $ne: null },
    }},
    { $group: {
        _id:    '$endpoint',
        total:  { $sum: 1 },
        errors: { $sum: { $cond: [{ $eq: ['$level', 'error'] }, 1, 0] } },
    }},
    { $match: { errors: { $gt: 0 } } },
    { $sort: { errors: -1 } },
    { $limit: n },
    { $project: {
        _id:       0,
        endpoint:  '$_id',
        errors:    1,
        total:     1,
        errorRate: {
          $round: [
            { $multiply: [{ $divide: ['$errors', '$total'] }, 100] },
            1,
          ],
        },
    }},
  ]);
}

/**
 * Returns a summary overview for a project dashboard card.
 *
 * @param {string} projectId
 * @param {string} range
 * @returns {{ totalRequests, errorCount, errorRate, avgMs, p95, p99 }}
 */
async function getOverviewStats(projectId, range = '1h') {
  const pid = require('mongoose').Types.ObjectId.createFromHexString(String(projectId));
  const timeFilter = resolveTimeRange(range);

  const [counts, latency] = await Promise.all([
    Log.aggregate([
      { $match: { projectId: pid, timestamp: timeFilter } },
      { $group: {
          _id:    null,
          total:  { $sum: 1 },
          errors: { $sum: { $cond: [{ $eq: ['$level', 'error'] }, 1, 0] } },
          warns:  { $sum: { $cond: [{ $eq: ['$level', 'warn'] }, 1, 0] } },
      }},
    ]),
    getLatencyPercentiles(projectId, range),
  ]);

  const stats = counts[0] || { total: 0, errors: 0, warns: 0 };

  return {
    totalRequests: stats.total,
    errorCount:    stats.errors,
    warnCount:     stats.warns,
    errorRate:     stats.total
      ? Math.round((stats.errors / stats.total) * 1000) / 10
      : 0,
    avgMs:  latency.avgMs,
    p50:    latency.p50,
    p95:    latency.p95,
    p99:    latency.p99,
  };
}

module.exports = {
  searchLogs,
  getThroughput,
  getLatencyPercentiles,
  getSlowestEndpoints,
  getTopFailingEndpoints,
  getOverviewStats,
};
