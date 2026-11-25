'use strict';

/**
 * monitor.service.js — SSRF-safe uptime checks for public URLs.
 *
 * Safety model:
 *   - Only http: / https: URLs, no credentials in the URL.
 *   - The hostname is resolved and EVERY resolved address must be public.
 *   - Redirects are followed manually (max 5 hops) and each hop is
 *     re-validated, so a public URL can't 302 us into 169.254.169.254.
 *   - Validation runs on every check, not just on create, so a DNS record
 *     that later changes to a private IP is caught.
 */

const dns = require('dns').promises;
const net = require('net');

const Monitor = require('../models/Monitor');
const Log     = require('../models/Log');
const { appEvents, EVENTS } = require('../utils/events');
const logger  = require('../utils/logger');

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS      = 5;
const USER_AGENT         = 'TraceNest-UptimeMonitor/1.0';

// ── Blocked address ranges ─────────────────────────────────────────
const blockList = new net.BlockList();
// IPv4
blockList.addSubnet('0.0.0.0',     8,  'ipv4'); // "this" network
blockList.addSubnet('10.0.0.0',    8,  'ipv4'); // private
blockList.addSubnet('100.64.0.0',  10, 'ipv4'); // carrier-grade NAT
blockList.addSubnet('127.0.0.0',   8,  'ipv4'); // loopback
blockList.addSubnet('169.254.0.0', 16, 'ipv4'); // link-local / cloud metadata
blockList.addSubnet('172.16.0.0',  12, 'ipv4'); // private
blockList.addSubnet('192.0.0.0',   24, 'ipv4'); // IETF protocol assignments
blockList.addSubnet('192.168.0.0', 16, 'ipv4'); // private
blockList.addSubnet('198.18.0.0',  15, 'ipv4'); // benchmarking
blockList.addSubnet('224.0.0.0',   4,  'ipv4'); // multicast
blockList.addSubnet('240.0.0.0',   4,  'ipv4'); // reserved + broadcast
// IPv6
blockList.addAddress('::',  'ipv6');            // unspecified
blockList.addAddress('::1', 'ipv6');            // loopback
blockList.addSubnet('fc00::', 7,  'ipv6');      // unique local
blockList.addSubnet('fe80::', 10, 'ipv6');      // link-local
blockList.addSubnet('ff00::', 8,  'ipv6');      // multicast

const BLOCKED_HOST_SUFFIXES = ['.localhost', '.internal', '.local'];

class UnsafeUrlError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

/** True if a literal IP address falls in a blocked range. */
function isBlockedIp(ip) {
  const family = net.isIP(ip);
  if (family === 4) return blockList.check(ip, 'ipv4');
  if (family === 6) {
    // IPv4-mapped IPv6 (::ffff:127.0.0.1) — check the embedded IPv4 address
    const mapped = ip.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return blockList.check(mapped[1], 'ipv4');
    return blockList.check(ip, 'ipv6');
  }
  return true; // Not an IP at all — treat as unsafe
}

/**
 * Validates that a URL is http(s) and resolves only to public addresses.
 * @param {string} urlString
 * @returns {Promise<URL>} the parsed URL
 * @throws {UnsafeUrlError}
 */
async function validatePublicUrl(urlString) {
  let url;
  try {
    url = new URL(String(urlString || '').trim());
  } catch {
    throw new UnsafeUrlError('Invalid URL');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new UnsafeUrlError('Only http:// and https:// URLs are allowed');
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError('URLs with embedded credentials are not allowed');
  }

  // URL.hostname wraps IPv6 literals in brackets
  const hostname = url.hostname.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.$/, '');
  if (!hostname) throw new UnsafeUrlError('URL has no hostname');

  if (hostname === 'localhost' || BLOCKED_HOST_SUFFIXES.some((s) => hostname.endsWith(s))) {
    throw new UnsafeUrlError('Local and internal hostnames are not allowed');
  }

  let addresses;
  if (net.isIP(hostname)) {
    addresses = [{ address: hostname }];
  } else {
    try {
      addresses = await dns.lookup(hostname, { all: true, verbatim: true });
    } catch {
      throw new UnsafeUrlError(`Could not resolve hostname "${hostname}"`);
    }
  }

  if (!addresses.length) throw new UnsafeUrlError(`Could not resolve hostname "${hostname}"`);
  if (addresses.some(({ address }) => isBlockedIp(address))) {
    throw new UnsafeUrlError('URL resolves to a private, loopback or link-local address');
  }

  return url;
}

/**
 * GETs a URL, following redirects manually and re-validating every hop.
 * @returns {Promise<Response>} the final (non-redirect) response
 */
async function safeFetch(urlString, signal) {
  let current = urlString;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await validatePublicUrl(current);
    const res = await fetch(url, {
      method:   'GET',
      signal,
      redirect: 'manual',
      headers:  { 'User-Agent': USER_AGENT, Accept: '*/*' },
    });

    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location) {
      // Free the socket before following the redirect
      await res.body?.cancel().catch(() => {});
      current = new URL(location, url).toString();
      continue;
    }
    return res;
  }

  throw new Error(`Too many redirects (> ${MAX_REDIRECTS})`);
}

/**
 * Runs one check against a monitor, updates its stats and writes a Log entry.
 *
 * @param {import('mongoose').Document|object} monitor — needs _id, url, name, projectId, intervalMinutes
 * @returns {Promise<object>} the updated monitor (lean)
 */
async function runMonitorCheck(monitor) {
  const signal  = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const started = process.hrtime.bigint();

  let statusCode = null;
  let error      = '';

  try {
    const res = await safeFetch(monitor.url, signal);
    statusCode = res.status;
    // We only need the status — don't download the body
    await res.body?.cancel().catch(() => {});
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      error = `Timed out after ${REQUEST_TIMEOUT_MS / 1000}s`;
    } else if (err instanceof UnsafeUrlError) {
      error = `Blocked: ${err.message}`;
    } else {
      // undici puts the useful reason (ECONNREFUSED, ENOTFOUND, cert errors…) on err.cause
      error = err.cause?.code || err.cause?.message || err.message || 'Request failed';
    }
  }

  const latencyMs = Math.round(Number(process.hrtime.bigint() - started) / 1e6);
  const isUp      = statusCode !== null && statusCode >= 200 && statusCode < 400;
  const now       = new Date();

  // ── Update monitor snapshot + counters ────────────────────────────
  const updated = await Monitor.findByIdAndUpdate(
    monitor._id,
    {
      $set: {
        lastStatus:     isUp ? 'up' : 'down',
        lastStatusCode: statusCode,
        lastLatencyMs:  latencyMs,
        lastError:      error,
        lastCheckedAt:  now,
        nextCheckAt:    new Date(now.getTime() + monitor.intervalMinutes * 60_000),
      },
      $inc: { totalChecks: 1, successfulChecks: isUp ? 1 : 0 },
    },
    { new: true }
  ).lean();

  // Monitor deleted mid-check — nothing to record
  if (!updated) return null;

  // ── Write a Log document into the project ─────────────────────────
  let level = 'info';
  if (statusCode === null || statusCode >= 500) level = 'error';
  else if (statusCode >= 400) level = 'warn';

  const message = statusCode !== null
    ? `Monitor "${monitor.name}" ${isUp ? 'UP' : 'DOWN'} (${statusCode}) in ${latencyMs}ms`
    : `Monitor "${monitor.name}" DOWN (${error}) after ${latencyMs}ms`;

  try {
    await Log.create({
      projectId:  monitor.projectId,
      timestamp:  now,
      level,
      message,
      method:     'GET',
      endpoint:   monitor.url.slice(0, 500),
      statusCode: statusCode ?? undefined,
      durationMs: latencyMs,
      meta: {
        source:    'uptime-monitor',
        monitorId: monitor._id,
        ...(error ? { error } : {}),
      },
      expiresAt: Log.makeExpiresAt(),
    });

    appEvents.emit(EVENTS.LOG_BATCH_SAVED, { projectId: monitor.projectId, count: 1 });
  } catch (err) {
    logger.error(`[monitor] Failed to write log for monitor ${monitor._id}: ${err.message}`);
  }

  return updated;
}

module.exports = {
  validatePublicUrl,
  runMonitorCheck,
  isBlockedIp,
  UnsafeUrlError,
};
