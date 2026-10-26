# TraceNest — Architecture & System Design

> **Self-hosted, lightweight log & performance monitoring platform for developers**

---

## 1. High-Level System Architecture

TraceNest is designed as an asynchronous, event-driven telemetry pipeline that decouples high-throughput log ingestion from database persistence and real-time visualization.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Host Applications                                │
│                     (e.g., Express College Results App)                     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Non-blocking HTTP / NDJSON Stream
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API Gateway / Server                              │
│  • Helmet (Security Headers)       • Express-Rate-Limit (DDoS Prevention)   │
│  • JWT Auth (Dashboard Users)      • SHA-256 API Key Auth (SDK Ingestion)   │
│  • Express Validation              • Route Controllers                      │
└───────────────────────┬─────────────────────────────┬───────────────────────┘
                        │ Push to Queue (HTTP 202)    │ Query / Aggregate
                        ▼                             ▼
                 ┌─────────────┐               ┌──────────────┐
                 │    Redis    │               │   MongoDB    │
                 │  (BullMQ)   │               │  (Mongoose)  │
                 └──────┬──────┘               └──────────────┘
                        │ Consume Batches              ▲
                        ▼                              │ bulkWrite()
                 ┌─────────────────────────────────────┴──────┐
                 │                Log Worker                  │
                 │  • Micro-batch consumer (concurrency = 5)  │
                 │  • Alert rule evaluator                    │
                 │  • Redis Pub/Sub event emitter             │
                 └──────────────────────┬─────────────────────┘
                                        │ Pub/Sub Notification
                                        ▼
                 ┌────────────────────────────────────────────┐
                 │          Server-Sent Events (SSE)          │
                 │          GET /api/sse?token=<jwt>          │
                 └──────────────────────┬─────────────────────┘
                                        │ Real-time Stream
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TraceNest Web Dashboard                             │
│       React 19 + Vite + Tailwind CSS + Recharts + Lucide Icons              │
│  [Overview Analytics]  [Log Explorer]  [Live Feed]  [Alert Rules]           │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Ingestion Pipeline & Decoupling

### Problem Solved
Under high traffic (e.g., traffic spikes or DDoS attempts), writing each incoming log synchronously to MongoDB creates extreme write contention, connection pool exhaustion, and stalls client API requests.

### Solution: Asynchronous BullMQ Queue
1. **Zero-Dependency SDK Buffer**:
   - The `@tracenest/sdk` Express middleware intercepts every request lifecycle via `res.on('finish')`.
   - Telemetry data is pushed to an in-memory ring buffer.
   - The buffer auto-flushes every `5 seconds` or whenever `100 events` accumulate.
2. **Ingest Endpoint (`POST /api/ingest` & `POST /api/ingest/batch`)**:
   - Validates the project API key using a constant-time SHA-256 hash lookup.
   - Pushes the normalized batch into BullMQ Redis Queue (`log-ingestion`).
   - Immediately returns **`HTTP 202 Accepted`** with the count of queued records (typical response time: **< 20ms**).
3. **Worker Processing (`logWorker.js`)**:
   - Multiple worker threads pull batches concurrently.
   - Inserts records into MongoDB using unordered `bulkWrite()` for maximum I/O throughput.
   - Automatically computes rolling metrics against active alert rules.

---

## 3. Data Models & Indexing Strategy

### Log Schema (`server/src/models/Log.js`)
| Field | Type | Description |
|---|---|---|
| `projectId` | ObjectId | Indexed foreign key linking log to its Project |
| `timestamp` | Date | Timestamp of event occurrence |
| `level` | String | Log severity: `info`, `warn`, `error`, `debug` |
| `message` | String | Text description (max 5,000 characters) |
| `endpoint` | String | HTTP route (e.g., `/results/:id`) |
| `method` | String | HTTP verb (`GET`, `POST`, etc.) |
| `statusCode`| Number | HTTP response code |
| `durationMs`| Number | High-resolution execution duration in ms |
| `stack` | String | Error call stack trace (if error) |
| `meta` | Object | Arbitrary JSON metadata |
| `expiresAt` | Date | TTL expiration timestamp (auto-purged after 30 days) |

### MongoDB Compound Indexes
To ensure sub-5ms query performance across millions of documents:
- **`{ projectId: 1, timestamp: -1 }`**: Powers dashboard overview charts and chronological feeds.
- **`{ projectId: 1, level: 1, timestamp: -1 }`**: Powers filtered error searches and incident views.
- **`{ projectId: 1, endpoint: 1, timestamp: -1 }`**: Powers slowest and top-failing route analytics.
- **`{ expiresAt: 1 }` (TTL Index)**: Automatically deletes logs older than the retention period without requiring cron jobs or manual deletions.

---

## 4. Failure Recovery & Error Isolation

- **Host App Protection**: The TraceNest SDK wraps all network operations in silent fail-safes. If the TraceNest API or Redis is temporarily down, the SDK discards un-flushed batches rather than crashing the client application.
- **BullMQ Retries**: Jobs pushed to Redis have exponential backoff retries (3 attempts). Failed jobs are logged and kept for administrative inspection.
- **Worker Isolation**: The worker runs as a dedicated decoupled container (`tracenest-worker`). If the worker crashes, incoming logs remain safe in the persistent Redis queue until the container restarts.

---

## 5. Security Architecture

1. **API Keys**:
   - Keys are generated with 24 cryptographically random bytes (`crypto.randomBytes(24)`), prefixed with `tn_`.
   - The raw key is returned to the developer **once** upon project creation.
   - Only a SHA-256 hash (`apiKeyHash`) is stored in MongoDB, ensuring leaks or database snapshots never expose active API keys.
2. **Dashboard Authentication**:
   - Passwords hashed with `bcryptjs` (salt rounds: 10).
   - Stateless JWT tokens (7-day validity).
3. **Hardened HTTP Middleware**:
   - `helmet` applies CSP, HSTS, and X-Content-Type headers.
   - `express-rate-limit` enforces rate limiting on public and auth endpoints.
