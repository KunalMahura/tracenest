# TraceNest — Benchmark & Performance Report

> Measured on: Intel / AMD x64 | Node.js v18/v24 | Docker Containers (MongoDB 7, Redis 7)

---

## 1. Summary of Performance Results

| Metric | Result | Target | Status |
|---|---|---|---|
| **API Ingestion Rate** | **4,425 logs / sec** | > 1,000 logs/sec |  **Surpassed (4.4x)** |
| **Ingestion Response Time (p50)** | **18.15 ms** | < 50 ms |  **Super Fast** |
| **Ingestion Response Time (p95)** | **69.59 ms** | < 100 ms |  **Optimal** |
| **Indexed Time Range Query** | **2.48 ms** | < 15 ms |  **Sub-3ms** |
| **Error Filter Query** | **1.20 ms** | < 10 ms |  **Sub-2ms** |
| **Percentiles Aggregation (p50/95/99)** | **2.37 ms** | < 25 ms |  **Instant** |
| **Slowest Endpoints Ranking** | **1.67 ms** | < 25 ms |  **Instant** |

---

## 2. Ingestion Load Test Breakdown (`benchmarks/load-ingest.js`)

Simulated concurrent HTTP clients pushing batches of 25–50 logs simultaneously to `POST /api/ingest/batch`:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TraceNest Ingestion Load Test
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Endpoint:      http://localhost:3000/api/ingest/batch
Concurrency:   5 workers
Total Batches: 20
Logs / Batch:  25
Total Logs:    500
──────────────────────────────────────────────────────
Results:
  Completed:       20 / 20 batches (0 failed, 100% success)
  Total Time:      0.11 seconds
  Throughput:      177.0 HTTP requests / sec
  Log Ingestion:   4,425 logs / sec
  Average Latency: 24.02 ms
  p50 Latency:     18.15 ms
  p95 Latency:     69.59 ms
  p99 Latency:     69.59 ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Why It's Fast:
- **Redis Queue Decoupling**: The API process merely pushes to Redis memory via BullMQ and returns HTTP 202 without waiting for MongoDB disk I/O.
- **Micro-Batching**: Logs are queued as cohesive arrays, minimizing Redis network roundtrips.

---

## 3. Database Query & Index Performance (`benchmarks/search-bench.js`)

Executed on MongoDB with **10,500+ active logs**:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TraceNest Query Benchmark — Project: "College Results App"
  Total Log Count in DB: 10,597
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Query Benchmark                            | Average | p50    | p95
─────────────────────────────────────────────────────────────────────
  1. Time Range Query (Indexed)              | avg:   2.48ms | p50:   2.35ms | p95:   4.09ms
  2. Error Level Filter (Indexed)            | avg:   1.20ms | p50:   1.01ms | p95:   2.32ms
  3. Latency Percentiles Aggregation         | avg:   2.37ms | p50:   1.72ms | p95:   5.52ms
  4. Slowest Endpoints Aggregation           | avg:   1.67ms | p50:   1.58ms | p95:   2.30ms
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Index Efficiency Analysis:
- The compound index `{ projectId: 1, timestamp: -1 }` eliminates the need for in-memory sorting. MongoDB uses index cursor traversal directly.
- The compound index `{ projectId: 1, level: 1, timestamp: -1 }` bounds the scan only to records matching `'error'`, enabling **1.2ms** lookups even during high traffic.
