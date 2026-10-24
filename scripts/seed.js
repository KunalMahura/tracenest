#!/usr/bin/env node
'use strict';

/**
 * seed.js — TraceNest Phase 1 seed script
 *
 * Creates a demo user, a demo project, and inserts 10,000 realistic log entries
 * directly into MongoDB (bypasses the queue for speed).
 *
 * Run inside the api container:
 *   docker compose exec api node scripts/seed.js
 *
 * Run locally (with MONGO_URI set):
 *   MONGO_URI=mongodb://localhost:27017/tracenest node scripts/seed.js
 */

require('dotenv').config();

const mongoose = require('mongoose');
const crypto   = require('crypto');

// We need to reference models, so add the server src to the path
const path = require('path');
const SRC  = path.join(__dirname, '../src');

const env     = require(path.join(SRC, 'config/env'));
const User    = require(path.join(SRC, 'models/User'));
const Project = require(path.join(SRC, 'models/Project'));
const Log     = require(path.join(SRC, 'models/Log'));

// ── Demo data ──────────────────────────────────────────────────────
const DEMO_USER = {
  name:  'Demo Developer',
  email: 'demo@tracenest.dev',
  password: 'secret123',
};

const DEMO_PROJECT = {
  name:        'College Results App',
  description: 'Demo app: fake college results website',
};

const ENDPOINTS = [
  '/results/:id',
  '/api/students',
  '/api/grades',
  '/api/courses',
  '/health',
  '/login',
  '/dashboard',
];

const METHODS  = ['GET', 'POST', 'PUT', 'DELETE'];
const LEVELS   = ['info', 'info', 'info', 'warn', 'error']; // Weighted toward info

const MESSAGES = {
  info:  ['Request completed', 'Student data fetched', 'Grade updated', 'Course listed', 'Login successful', 'Cache hit'],
  warn:  ['Slow query detected', 'High memory usage', 'Deprecated endpoint called', 'Retry attempt'],
  error: ['Database timeout', 'Authentication failed', 'Not found', 'Internal server error', 'Rate limit exceeded'],
};

/**
 * Generates a single random log entry.
 */
function makeLog(projectId) {
  const level    = LEVELS[Math.floor(Math.random() * LEVELS.length)];
  const endpoint = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
  const method   = METHODS[Math.floor(Math.random() * METHODS.length)];
  const msgs     = MESSAGES[level];
  const message  = msgs[Math.floor(Math.random() * msgs.length)];

  // Random timestamp in the last 7 days
  const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

  // Latency distribution: most requests fast, some slow, rare very slow
  const durationMs = level === 'error'
    ? 1000 + Math.random() * 5000   // Errors: 1-6s
    : level === 'warn'
      ? 500 + Math.random() * 1500  // Warnings: 0.5-2s
      : 10 + Math.random() * 200;   // Info: 10-210ms

  const statusCode = level === 'error'
    ? [400, 401, 403, 404, 500, 503][Math.floor(Math.random() * 6)]
    : level === 'warn'
      ? [200, 301, 429][Math.floor(Math.random() * 3)]
      : 200;

  return {
    projectId,
    timestamp,
    level,
    message,
    method,
    endpoint,
    statusCode,
    durationMs: Math.round(durationMs),
    stack: level === 'error' ? `Error: ${message}\n    at processRequest (app.js:42)\n    at Layer.handle [as handle_request] (router/layer.js:95)` : undefined,
    meta: { seed: true, requestId: crypto.randomBytes(8).toString('hex') },
    expiresAt: Log.makeExpiresAt(),
  };
}

async function seed() {
  console.log('🌱 TraceNest seed script starting...\n');

  // Connect to MongoDB
  await mongoose.connect(env.MONGO_URI);
  console.log(`✓ Connected to MongoDB: ${env.MONGO_URI}`);

  // ── User ──────────────────────────────────────────────────────────
  let user = await User.findOne({ email: DEMO_USER.email });
  if (user) {
    console.log(`✓ Demo user already exists: ${user.email}`);
  } else {
    user = await User.create({
      name:         DEMO_USER.name,
      email:        DEMO_USER.email,
      passwordHash: DEMO_USER.password, // Pre-save hook will hash this
    });
    console.log(`✓ Created demo user: ${user.email}`);
  }

  // ── Project ───────────────────────────────────────────────────────
  let project = await Project.findOne({ userId: user._id, name: DEMO_PROJECT.name });
  let displayKey = null;

  if (project) {
    console.log(`✓ Demo project already exists: "${project.name}" (prefix: ${project.apiKeyPrefix})`);
  } else {
    const { rawKey, hash, prefix } = Project.generateApiKey();
    displayKey = rawKey;

    project = await Project.create({
      userId:       user._id,
      name:         DEMO_PROJECT.name,
      description:  DEMO_PROJECT.description,
      apiKeyHash:   hash,
      apiKeyPrefix: prefix,
    });
    console.log(`✓ Created demo project: "${project.name}"`);
    console.log(`  API Key (save this!): ${rawKey}`);
  }

  // ── Logs ──────────────────────────────────────────────────────────
  const TOTAL = 10_000;
  const CHUNK = 500; // insertMany in chunks of 500

  const existingCount = await Log.countDocuments({ projectId: project._id });
  if (existingCount >= TOTAL) {
    console.log(`✓ Already have ${existingCount.toLocaleString()} logs — skipping log insert`);
  } else {
    console.log(`\n📝 Inserting ${TOTAL.toLocaleString()} seed logs (in ${TOTAL/CHUNK} batches)...`);
    const start = Date.now();

    for (let i = 0; i < TOTAL; i += CHUNK) {
      const batch = Array.from({ length: CHUNK }, () => makeLog(project._id));
      await Log.insertMany(batch, { ordered: false });
      process.stdout.write(`  ${Math.min(i + CHUNK, TOTAL).toLocaleString()} / ${TOTAL.toLocaleString()}\r`);
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n✓ Inserted ${TOTAL.toLocaleString()} logs in ${elapsed}s`);
  }

  // ── Summary ───────────────────────────────────────────────────────
  const logCount = await Log.countDocuments({ projectId: project._id });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  TraceNest Seed Complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Email:      ${DEMO_USER.email}`);
  console.log(`  Password:   ${DEMO_USER.password}`);
  console.log(`  Project ID: ${project._id}`);
  console.log(`  API Prefix: ${project.apiKeyPrefix}...`);
  console.log(`  Log count:  ${logCount.toLocaleString()}`);
  if (displayKey) {
    console.log(`\n  ⚠️  API Key (not stored, save now): ${displayKey}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('\n❌ Seed failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
