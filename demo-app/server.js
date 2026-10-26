'use strict';
require('dotenv').config();

/**
 * TraceNest Demo App — College Results Portal
 * ─────────────────────────────────────────────
 * A realistic mock Express application that uses the TraceNest SDK to
 * stream live traffic into TraceNest. Every endpoint is designed to generate
 * a realistic mix of:
 *   • Fast 200 responses  (~60% of traffic)
 *   • Slow responses       (~20% — simulates DB query lag)
 *   • 404 not found        (~10%)
 *   • 500 server errors    (~10% — triggers error alerts)
 *
 * After startup, a background traffic generator fires random requests
 * every 1–3 seconds so the TraceNest dashboard stays live without
 * any manual cURL commands.
 */

const express = require('express');
const http    = require('http');
const path    = require('path');
const { tracenest, createClient } = require('../sdk/index.js');

const app  = express();
const PORT = process.env.DEMO_PORT || 4000;

// ── Config from .env or env vars ──────────────────────────────────
const TRACENEST_HOST = process.env.TRACENEST_HOST || 'http://localhost:3000';
const API_KEY        = process.env.TRACENEST_API_KEY;
const PROJECT_ID     = process.env.TRACENEST_PROJECT_ID;

if (!API_KEY || !PROJECT_ID) {
  console.error('⚠️  TRACENEST_API_KEY and TRACENEST_PROJECT_ID must be set in .env');
  process.exit(1);
}

// ── Wire up TraceNest SDK middleware ──────────────────────────────
app.use(tracenest({
  apiKey:    API_KEY,
  projectId: PROJECT_ID,
  host:      TRACENEST_HOST,
  flushEvery: 2000,    // Flush every 2s for responsive live dashboard
  batchSize:  10,
  service:   'college-portal',
  debug:     false,
}));

// Also create a standalone client for custom manual logs
const tnClient = createClient({
  apiKey:     API_KEY,
  projectId:  PROJECT_ID,
  host:       TRACENEST_HOST,
  flushEvery: 2000,
});

app.use(express.json());

// ── Helper: simulate async work with latency ─────────────────────
function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shouldFail(rate)  { return Math.random() < rate; }
function shouldBeSlow(rate){ return Math.random() < rate; }

// ── Student data pool ─────────────────────────────────────────────
const STUDENTS = Array.from({ length: 200 }, (_, i) => ({
  id:     i + 1001,
  name:   `Student ${i + 1}`,
  roll:   `CS${2020 + (i % 4)}-${String(i).padStart(3, '0')}`,
  grade:  ['A+', 'A', 'B+', 'B', 'C', 'F'][Math.floor(Math.random() * 6)],
  cgpa:   +(Math.random() * 4 + 6).toFixed(2),
}));

const SUBJECTS = [
  { code: 'CS301', name: 'Data Structures', credits: 4 },
  { code: 'CS302', name: 'Algorithms',      credits: 4 },
  { code: 'CS303', name: 'DBMS',            credits: 3 },
  { code: 'CS304', name: 'Networks',        credits: 3 },
  { code: 'CS305', name: 'OS',              credits: 3 },
];

// ── Routes ────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.json({
    service: 'College Results Portal',
    version: '1.0.0',
    routes:  ['/results/:studentId', '/results/batch', '/subjects', '/rankings', '/admin/report'],
  });
});

// GET /results/:studentId — 200 normally, sometimes slow, sometimes 404/500
app.get('/results/:studentId', async (req, res) => {
  const sid = parseInt(req.params.studentId, 10);

  if (shouldBeSlow(0.25)) await delay(randInt(800, 3000)); // Simulate slow DB query

  if (shouldFail(0.1)) {
    tnClient.error(`Unhandled exception fetching results for student ${sid}`, {
      endpoint: '/results/:studentId',
      errorType: 'DatabaseTimeoutError',
      studentId: sid,
    });
    return res.status(500).json({ error: 'Internal server error — database timeout' });
  }

  const student = STUDENTS.find((s) => s.id === sid);
  if (!student) {
    return res.status(404).json({ error: `Student ${sid} not found` });
  }

  res.json({
    student,
    results: SUBJECTS.map((s) => ({
      ...s,
      marks: randInt(40, 100),
      grade: student.grade,
    })),
  });
});

// POST /results/batch — bulk results lookup, sometimes very slow
app.post('/results/batch', async (req, res) => {
  const ids = req.body?.ids || [];

  if (shouldBeSlow(0.35)) await delay(randInt(1500, 5000));

  if (shouldFail(0.08)) {
    tnClient.error('Batch results query exceeded memory limit', {
      endpoint: '/results/batch',
      batchSize: ids.length,
    });
    return res.status(500).json({ error: 'Memory limit exceeded during batch query' });
  }

  const students = ids
    .map((id) => STUDENTS.find((s) => s.id === id))
    .filter(Boolean);

  res.json({ found: students.length, results: students });
});

// GET /subjects — almost always fast
app.get('/subjects', async (req, res) => {
  if (shouldBeSlow(0.05)) await delay(randInt(200, 600));
  res.json({ subjects: SUBJECTS });
});

// GET /rankings — CPU-intensive simulation, often slow
app.get('/rankings', async (req, res) => {
  await delay(randInt(300, 2000)); // Always takes some time to compute

  if (shouldFail(0.12)) {
    tnClient.warn('Rankings computation hit timeout limit', {
      endpoint: '/rankings',
      computeTimeMs: 2000,
    });
    return res.status(503).json({ error: 'Rankings computation timed out — try again later' });
  }

  const sorted = [...STUDENTS]
    .sort((a, b) => b.cgpa - a.cgpa)
    .slice(0, 20);

  res.json({ rankings: sorted });
});

// GET /admin/report — protected, always fails 403
app.get('/admin/report', (req, res) => {
  tnClient.warn('Unauthorized admin report access attempt', {
    endpoint: '/admin/report',
    ip: req.ip,
  });
  res.status(403).json({ error: 'Access denied — admin token required' });
});

// ── 404 handler ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

// ── Error handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  tnClient.error(`Unhandled Express error: ${err.message}`, {
    stack: err.stack,
    endpoint: req.path,
  });
  res.status(500).json({ error: 'Internal server error' });
});

// ── Traffic generator ──────────────────────────────────────────────
// Fires automated requests so the TraceNest dashboard always shows live data
const ENDPOINTS = [
  () => ({ path: `/results/${randInt(1001, 1200)}`,  method: 'GET' }),
  () => ({ path: `/results/${randInt(1200, 1300)}`,  method: 'GET' }),
  () => ({ path: `/results/${randInt(9000, 9010)}`,  method: 'GET' }), // Mostly 404s
  () => ({ path: '/subjects',                         method: 'GET' }),
  () => ({ path: '/rankings',                         method: 'GET' }),
  () => ({ path: '/admin/report',                     method: 'GET' }),
  () => ({ path: '/nonexistent-page',                 method: 'GET' }),
];

function fireRequest(port) {
  const ep  = ENDPOINTS[randInt(0, ENDPOINTS.length - 1)]();
  const req = http.request(
    { hostname: '127.0.0.1', port, path: ep.path, method: ep.method },
    (res) => { res.resume(); }
  );
  req.on('error', () => {}); // Silently ignore self-request errors
  req.end();
}

// ── Start server ───────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  📡 TraceNest Demo App`);
  console.log(`  URL:     http://localhost:${PORT}`);
  console.log(`  Project: ${PROJECT_ID}`);
  console.log(`  Target:  ${TRACENEST_HOST}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // Start auto-traffic after 2s (let server settle)
  setTimeout(() => {
    console.log('🚦 Auto-traffic generator started (1 req/sec)');
    setInterval(() => fireRequest(PORT), randInt(700, 1500));
  }, 2000);
});

process.on('SIGTERM', () => {
  tnClient.shutdown().then(() => server.close());
});
