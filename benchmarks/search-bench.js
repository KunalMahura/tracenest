#!/usr/bin/env node
'use strict';

/**
 * search-bench.js — MongoDB Index & Query Performance Benchmark.
 *
 * Compares:
 *   1. Compound indexed query (projectId + timestamp range)
 *   2. Filtered indexed query (projectId + level + timestamp range)
 *   3. Percentiles aggregation pipeline
 *   4. Slowest endpoints ranking aggregation
 *
 * Usage:
 *   Inside container: docker compose exec api node benchmarks/search-bench.js
 *   Locally on host:  node benchmarks/search-bench.js
 */

const fs   = require('fs');
const path = require('path');

// Resolve server path whether running inside Docker (/app) or from project root
const serverPath = fs.existsSync(path.join(__dirname, '../server/src'))
  ? path.join(__dirname, '../server/src')
  : path.join(__dirname, '../src');

require(path.join(serverPath, '../node_modules/dotenv')).config();
const mongoose = require(path.join(serverPath, '../node_modules/mongoose'));

const env     = require(path.join(serverPath, 'config/env'));
const Project = require(path.join(serverPath, 'models/Project'));
const Log     = require(path.join(serverPath, 'models/Log'));

async function benchmark(name, fn, iterations = 10) {
  const times = [];
  let lastResult;
  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    lastResult = await fn();
    const end = process.hrtime.bigint();
    times.push(Number(end - start) / 1e6);
  }
  times.sort((a, b) => a - b);
  const avg = (times.reduce((s, t) => s + t, 0) / times.length).toFixed(2);
  const p50 = times[Math.floor(times.length * 0.5)].toFixed(2);
  const p95 = times[Math.floor(times.length * 0.95)].toFixed(2);
  console.log(`  ${name.padEnd(42)} | avg: ${avg.padStart(6)}ms | p50: ${p50.padStart(6)}ms | p95: ${p95.padStart(6)}ms`);
  return lastResult;
}

async function run() {
  console.log(`Connecting to MongoDB at ${env.MONGO_URI}...`);
  await mongoose.connect(env.MONGO_URI);

  const project = await Project.findOne();
  if (!project) {
    console.error('No project found. Run scripts/seed.js first.');
    process.exit(1);
  }

  const projectId = project._id;
  const totalLogs = await Log.countDocuments({ projectId });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  TraceNest Query Benchmark — Project: "${project.name}"`);
  console.log(`  Total Log Count in DB: ${totalLogs.toLocaleString()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Query Benchmark                            | Average | p50    | p95');
  console.log('─────────────────────────────────────────────────────────────────────');

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 1. Time-range query (compound index on projectId + timestamp)
  await benchmark('1. Time Range Query (Indexed)', () =>
    Log.find({ projectId, timestamp: { $gte: oneDayAgo } })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean()
  );

  // 2. Level filter query (compound index on projectId + level + timestamp)
  await benchmark('2. Error Level Filter (Indexed)', () =>
    Log.find({ projectId, level: 'error', timestamp: { $gte: oneDayAgo } })
      .sort({ timestamp: -1 })
      .limit(50)
      .lean()
  );

  // 3. Percentiles aggregation pipeline
  await benchmark('3. Latency Percentiles Aggregation', () =>
    Log.aggregate([
      { $match: { projectId, timestamp: { $gte: oneDayAgo }, durationMs: { $gt: 0 } } },
      { $sort: { durationMs: 1 } },
      { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: '$durationMs' } } },
    ])
  );

  // 4. Slowest endpoints ranking aggregation
  await benchmark('4. Slowest Endpoints Aggregation', () =>
    Log.aggregate([
      { $match: { projectId, timestamp: { $gte: oneDayAgo } } },
      { $group: { _id: '$endpoint', avg: { $avg: '$durationMs' }, count: { $sum: 1 } } },
      { $sort: { avg: -1 } },
      { $limit: 10 },
    ])
  );

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Query benchmark failed:', err);
  process.exit(1);
});
