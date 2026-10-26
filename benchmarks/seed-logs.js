#!/usr/bin/env node
'use strict';

/**
 * seed-logs.js — High-volume log generator for stress testing and benchmarking.
 *
 * Uses MongoDB bulkWrite() with unordered inserts for maximum throughput.
 * Can generate 50,000 to 500,000+ realistic logs across a 24-hour time window.
 *
 * Usage:
 *   node benchmarks/seed-logs.js [totalLogs=50000] [batchSize=5000]
 */

const fs   = require('fs');
const path = require('path');

const serverPath = fs.existsSync(path.join(__dirname, '../server/src'))
  ? path.join(__dirname, '../server/src')
  : path.join(__dirname, '../src');

require(path.join(serverPath, '../node_modules/dotenv')).config();
const mongoose = require(path.join(serverPath, '../node_modules/mongoose'));

const env     = require(path.join(serverPath, 'config/env'));
const Project = require(path.join(serverPath, 'models/Project'));
const Log     = require(path.join(serverPath, 'models/Log'));

const TOTAL_LOGS = parseInt(process.argv[2], 10) || 50000;
const BATCH_SIZE = parseInt(process.argv[3], 10) || 5000;

const ENDPOINTS = [
  '/results/:id',
  '/api/students',
  '/api/grades',
  '/api/courses',
  '/health',
  '/login',
  '/dashboard',
  '/api/admin/reports',
];

const METHODS = ['GET', 'POST', 'PUT', 'DELETE'];
const LEVELS  = ['info', 'info', 'info', 'info', 'warn', 'error'];
const MSGS = {
  info:  ['User queried results', 'Record retrieved from cache', 'Auth token refreshed', 'Student profile loaded'],
  warn:  ['Database connection pool busy', 'Slow response from upstream', 'Deprecation warning: query params missing'],
  error: ['Database timeout error', 'Unhandled exception in controller', 'External service failed', 'Out of memory caught'],
};

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function run() {
  console.log(`Connecting to MongoDB at ${env.MONGO_URI}...`);
  await mongoose.connect(env.MONGO_URI);
  console.log('Connected.');

  let project = await Project.findOne();
  if (!project) {
    console.error('No project found in database! Please run scripts/seed.js first.');
    process.exit(1);
  }

  const projectId = project._id;
  console.log(`Target Project: "${project.name}" (ID: ${projectId})`);
  console.log(`Generating ${TOTAL_LOGS.toLocaleString()} logs in batches of ${BATCH_SIZE.toLocaleString()}...`);

  const startTime = Date.now();
  let inserted = 0;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const expiresAt = new Date(now + 30 * dayMs);

  while (inserted < TOTAL_LOGS) {
    const currentBatchSize = Math.min(BATCH_SIZE, TOTAL_LOGS - inserted);
    const operations = new Array(currentBatchSize);

    for (let i = 0; i < currentBatchSize; i++) {
      const level = randomItem(LEVELS);
      const endpoint = randomItem(ENDPOINTS);
      const isError = level === 'error';
      const statusCode = isError ? randomItem([500, 502, 504]) : (level === 'warn' ? 429 : 200);
      const durationMs = isError ? (500 + Math.random() * 2500) : (10 + Math.random() * 150);
      const timestamp = new Date(now - Math.random() * dayMs);

      operations[i] = {
        insertOne: {
          document: {
            projectId,
            level,
            message: randomItem(MSGS[level]),
            endpoint,
            method: randomItem(METHODS),
            statusCode,
            durationMs: Math.round(durationMs * 10) / 10,
            timestamp,
            expiresAt,
            meta: { env: 'benchmark', iteration: inserted + i },
          },
        },
      };
    }

    await Log.bulkWrite(operations, { ordered: false });
    inserted += currentBatchSize;
    process.stdout.write(`\rInserted: ${inserted.toLocaleString()} / ${TOTAL_LOGS.toLocaleString()} (${Math.round((inserted/TOTAL_LOGS)*100)}%)`);
  }

  const elapsedSec = (Date.now() - startTime) / 1000;
  const logsPerSec = Math.round(TOTAL_LOGS / elapsedSec);

  console.log(`\n\n Done! Inserted ${TOTAL_LOGS.toLocaleString()} logs in ${elapsedSec.toFixed(2)}s (${logsPerSec.toLocaleString()} logs/sec)`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Benchmark seed failed:', err);
  process.exit(1);
});
