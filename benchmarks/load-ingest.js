#!/usr/bin/env node
'use strict';

/**
 * load-ingest.js — Stress-test HTTP ingestion pipeline.
 *
 * Sends concurrent batches of logs to POST /api/ingest/batch,
 * measuring latency percentiles, throughput (req/sec & logs/sec),
 * and queue absorption rate.
 *
 * Usage:
 *   node benchmarks/load-ingest.js [concurrency=10] [batches=100] [logsPerBatch=50]
 */

const http = require('http');

const HOST          = process.env.API_HOST || 'localhost';
const PORT          = parseInt(process.env.API_PORT, 10) || 3000;
const API_KEY       = process.env.TRACENEST_API_KEY || 'tn_4233af265068abcd1cf88e0c8c027db8cb7a292926c3f7df';

const CONCURRENCY   = parseInt(process.argv[2], 10) || 10;
const TOTAL_BATCHES = parseInt(process.argv[3], 10) || 100;
const BATCH_SIZE    = parseInt(process.argv[4], 10) || 50;

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('  TraceNest Ingestion Load Test');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Endpoint:      http://${HOST}:${PORT}/api/ingest/batch`);
console.log(`Concurrency:   ${CONCURRENCY}`);
console.log(`Total Batches: ${TOTAL_BATCHES}`);
console.log(`Logs / Batch:  ${BATCH_SIZE}`);
console.log(`Total Logs:    ${(TOTAL_BATCHES * BATCH_SIZE).toLocaleString()}`);
console.log('──────────────────────────────────────────────────────');

const sampleLog = {
  level: 'info',
  message: 'Load test synthetic telemetry log',
  endpoint: '/api/students/records',
  method: 'GET',
  statusCode: 200,
  durationMs: 45.2,
};

function generateBatch(size) {
  return Array.from({ length: size }, () => ({
    ...sampleLog,
    timestamp: new Date().toISOString(),
  }));
}

function sendBatch(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const start = process.hrtime.bigint();

    const req = http.request(
      {
        hostname: HOST,
        port: PORT,
        path: '/api/ingest/batch',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'X-API-Key': API_KEY,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          const end = process.hrtime.bigint();
          const latencyMs = Number(end - start) / 1e6;
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, latencyMs });
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  const latencies = [];
  let completed = 0;
  let failed = 0;
  let batchIndex = 0;

  const testStart = Date.now();

  async function worker() {
    while (batchIndex < TOTAL_BATCHES) {
      const current = batchIndex++;
      const batch = generateBatch(BATCH_SIZE);
      try {
        const result = await sendBatch(batch);
        latencies.push(result.latencyMs);
        completed++;
      } catch (err) {
        failed++;
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const totalTimeSec = (Date.now() - testStart) / 1000;
  latencies.sort((a, b) => a - b);

  const p50 = latencies[Math.floor(latencies.length * 0.50)] || 0;
  const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const avg = latencies.reduce((sum, v) => sum + v, 0) / (latencies.length || 1);

  const reqPerSec = (completed / totalTimeSec).toFixed(1);
  const logsPerSec = ((completed * BATCH_SIZE) / totalTimeSec).toFixed(0);

  console.log('\nResults:');
  console.log(`  Completed:       ${completed} / ${TOTAL_BATCHES} batches (${failed} failed)`);
  console.log(`  Total Time:      ${totalTimeSec.toFixed(2)}s`);
  console.log(`  Throughput:      ${reqPerSec} requests/sec`);
  console.log(`  Log Ingestion:   ${Number(logsPerSec).toLocaleString()} logs/sec`);
  console.log(`  Average Latency: ${avg.toFixed(2)}ms`);
  console.log(`  p50 Latency:     ${p50.toFixed(2)}ms`);
  console.log(`  p95 Latency:     ${p95.toFixed(2)}ms`);
  console.log(`  p99 Latency:     ${p99.toFixed(2)}ms`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

run().catch((err) => {
  console.error('Load test error:', err);
  process.exit(1);
});
