'use strict';

const { getRedis } = require('../config/redis');
const env = require('../config/env');

/**
 * Per-project daily log quota.
 *
 * Counts live in Redis under quota:<projectId>:<YYYY-MM-DD> (UTC). Using a
 * date-stamped key means the "daily reset" is automatic — a new day is a new
 * key — and INCRBY is atomic, so concurrent ingest requests across several API
 * instances can never over-admit. Keys expire after 48h to clean themselves up.
 *
 * Counting in Redis instead of $inc-ing the Project document keeps a MongoDB
 * write off the hot ingest path.
 */

const KEY_TTL_SECONDS = 48 * 60 * 60;

function todayUTC(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function quotaKey(projectId, day = todayUTC()) {
  return `quota:${projectId}:${day}`;
}

/** Next UTC midnight, when the counter resets. */
function nextResetDate(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

function limitFor(project) {
  const q = project.dailyLogQuota;
  return Number.isFinite(q) && q >= 0 ? q : env.DEFAULT_DAILY_LOG_QUOTA;
}

function buildStatus(limit, used) {
  return {
    limit,
    used: Math.min(used, limit),
    remaining: Math.max(limit - used, 0),
    resetsAt: nextResetDate().toISOString(),
  };
}

/**
 * Atomically reserves `count` logs against today's quota.
 * If the reservation would exceed the limit, it is rolled back and
 * { allowed: false } is returned — the batch is rejected as a whole.
 *
 * @param {object} project — Project document (needs _id and dailyLogQuota)
 * @param {number} count   — number of logs in this request
 */
async function reserveQuota(project, count) {
  const redis = getRedis();
  const key   = quotaKey(project._id);
  const limit = limitFor(project);

  const [[incErr, used]] = await redis.multi().incrby(key, count).expire(key, KEY_TTL_SECONDS).exec();
  if (incErr) throw incErr;

  if (used > limit) {
    await redis.decrby(key, count);
    return { allowed: false, ...buildStatus(limit, used - count) };
  }
  return { allowed: true, ...buildStatus(limit, used) };
}

/** Read-only usage for today. */
async function getUsage(project) {
  const raw = await getRedis().get(quotaKey(project._id));
  return buildStatus(limitFor(project), parseInt(raw, 10) || 0);
}

/** Writes X-Quota-* headers so SDKs and curl users can see their usage. */
function setQuotaHeaders(res, status) {
  res.setHeader('X-Quota-Limit', status.limit);
  res.setHeader('X-Quota-Used', status.used);
  res.setHeader('X-Quota-Remaining', status.remaining);
  res.setHeader('X-Quota-Reset', status.resetsAt);
}

module.exports = { reserveQuota, getUsage, setQuotaHeaders, quotaKey };
