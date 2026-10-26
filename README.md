# TraceNest

> **Self-hosted log and performance monitoring platform — a lightweight Datadog/Sentry for developers.**

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-lightgrey.svg)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-brightgreen.svg)](https://mongodb.com)
[![Redis](https://img.shields.io/badge/Redis-7.0-red.svg)](https://redis.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://docker.com)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![Tests](https://img.shields.io/badge/Tests-22%2F22%20Passing-success.svg)](#running-tests)

TraceNest collects distributed application logs and HTTP performance metrics from any service and visualizes them in a real-time dashboard: failing APIs, slow requests, latency percentiles (p50/p95/p99), searchable error logs, and automated alerts.

---

## Architecture Overview

```
[ External Apps / Demo Portal ]
             │
      (TraceNest SDK)  ─── Non-blocking in-memory ring buffer
             │ HTTP / NDJSON Stream
             ▼
   [ Express API Gateway ] ──── Auth & Rate Limiting (Returns HTTP 202)
             │
        (BullMQ Job)
             ▼
         [ Redis ] ──────── Fast in-memory ingestion queue
             │
        (Pop Batches)
             ▼
     [ Log Worker ] ──────── MongoDB bulkWrite() & Alert Evaluation
             │
    ┌────────┴──────────────┐
    ▼                       ▼
[ MongoDB ]             [ Redis Pub/Sub ]
(Logs & Aggregations)       │
                            ▼
                       [ SSE Stream ]
                            │
                            ▼
                   [ React Dashboard ]
```

---

## Core Features

- ⚡ **High-Throughput Ingestion**: Benchmarked at **4,425+ logs/sec** at **18ms** median response latency via BullMQ + Redis.
- 📊 **Performance Analytics**: Real-time throughput graphs, error rates, and **p50, p95, p99** response time percentiles.
- 🔍 **Log Explorer**: Full-text keyword search, regex filtering, level badges (`error`, `warn`, `info`, `debug`), and keyset pagination.
- 📡 **Live Telemetry Stream**: Real-time log streaming using **Server-Sent Events (SSE)** without WebSocket connection overhead.
- 🚨 **Proactive Alerting**: Automated evaluation of threshold conditions (e.g. error rate > 5% over 5m) with incident resolution workflows.
- 📦 **Zero-Dependency SDK**: Express middleware with automatic request timing (`process.hrtime`), error interception, and background batch flushing.
- 🎓 **Demo Application**: Pre-configured mock **College Results Portal** generating realistic fast, slow, 404, and 500 requests.

---

## Quick Start (Docker Compose)

### 1. Start all 5 services with Docker Compose
```bash
git clone https://github.com/KunalMahura/tracenest.git
cd tracenest

# Start MongoDB, Redis, API, Worker, Dashboard, and Demo App
docker compose up --build
```

### 2. Access the Application
- **TraceNest Web Dashboard**: [http://localhost:5173](http://localhost:5173)  
  - Email: `demo@tracenest.dev`  
  - Password: `secret123`
- **TraceNest API Server**: [http://localhost:3000](http://localhost:3000)
- **Demo College Results App**: [http://localhost:4000](http://localhost:4000)

---

## Running Locally Without Docker

If you prefer running services directly on your host machine:

### 1. Start MongoDB and Redis
Ensure MongoDB (`localhost:27017`) and Redis (`localhost:6379`) are running.

### 2. Start the API Server & Worker
```powershell
cd server
npm install
npm run dev          # Terminal 1: API on port 3000
npm run worker:dev   # Terminal 2: BullMQ worker
```

### 3. Start the Dashboard
```powershell
cd dashboard
npm install --legacy-peer-deps
npm run dev          # Terminal 3: Dashboard on port 5173
```

### 4. Start the Demo App
```powershell
cd demo-app
npm install
npm start            # Terminal 4: Demo app on port 4000
```

---

## Running Tests

TraceNest includes a comprehensive end-to-end integration test suite covering Auth, Project API Keys, Ingestion Queues, Analytics Percentiles, and Alert Rules:

```bash
# Run tests inside Docker container
docker compose exec api npm test

# Or run locally in server/
cd server
npm test
```

**Test Results:**
```
PASS tests/analytics.test.js
PASS tests/auth.test.js
PASS tests/ingest.test.js
PASS tests/alerts.test.js
PASS tests/projects.test.js

Test Suites: 5 passed, 5 total
Tests:       22 passed, 22 total
```

---

## Performance Benchmarks

Run the benchmark suite to verify system throughput and database latency:

### Ingestion Throughput Test
```bash
# Tests 20 batches of 25 logs across 5 concurrent workers
node benchmarks/load-ingest.js 5 20 25
```
> **Result**: **4,425 logs/sec** | p50 latency: **18.15ms** | 100% success rate.

### Query Latency Benchmark
```bash
docker compose exec api node benchmarks/search-bench.js
```
> **Result**:
> - Time-Range Query (Indexed): **2.48ms**
> - Error Filter Query (Indexed): **1.20ms**
> - Latency Percentiles Aggregation: **2.37ms**
> - Slowest Endpoints Ranking: **1.67ms**

---

## Documentation Links

- 🏛️ [System Architecture & Design Deep Dive](docs/architecture.md)
- 📖 [Complete REST API Reference](docs/api.md)
- 📈 [Benchmark & Performance Report](docs/benchmark-results.md)
- 📮 [Postman Collection](docs/TraceNest.postman_collection.json)

---

## Viva & Technical Interview Questions

<details>
<summary><b>Click to expand Viva preparation notes</b></summary>

### 1. Why use Redis & BullMQ instead of writing logs directly to MongoDB?
Writing each log directly to MongoDB during high traffic causes connection exhaustion and disk write bottlenecks. Redis absorbs incoming requests in memory at microsecond latency, allowing the API to return HTTP 202 in < 20ms. The worker then inserts logs in batches using MongoDB `bulkWrite()`.

### 2. Why Server-Sent Events (SSE) instead of WebSockets?
WebSockets require a bidirectional TCP handshake and protocol upgrade overhead. Log telemetry is fundamentally unidirectional (server pushes to client). SSE operates over standard HTTP, has native browser auto-reconnect, and uses fewer resources.

### 3. How are API keys secured?
API keys are prefixed with `tn_` and generated using 24 cryptographically secure random bytes. The raw key is shown only once to the developer. The database only stores a constant-time SHA-256 hash (`apiKeyHash`), preventing exposure during database dumps.

### 4. How are latency percentiles (p50, p95, p99) computed?
Averages hide latency spikes. TraceNest uses MongoDB aggregation pipelines to sort request durations within rolling time windows. The 50th percentile reflects normal user experience, while p95 and p99 surface critical tail-latency bottlenecks.

</details>

---

## License
MIT License. Free and open source for all developers.
