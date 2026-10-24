# TraceNest

> Self-hosted log and performance monitoring platform — a lightweight Datadog/Sentry for developers.

TraceNest collects logs and HTTP request metrics from any application and displays them in one dashboard: failing APIs, slow requests, searchable error logs, and configurable alerts.

---

## Architecture

```
Your App + SDK  →  POST /api/ingest  →  Redis (BullMQ Queue)  →  Log Worker  →  MongoDB
                                                                        ↓
React Dashboard  ←  GET /api/logs, /api/analytics, /api/alerts  ←  MongoDB
```

---

## Quick Start (Docker Compose)

### Prerequisites
- Docker Desktop installed and running
- Ports 3000, 27017, 6379 free

### 1. Clone and start

```bash
git clone https://github.com/yourname/tracenest.git
cd tracenest

# Start all services (MongoDB, Redis, API server, Log Worker)
docker compose up --build
```

Wait for:
```
tracenest-api     | TraceNest API  |  port 3000  |  development
tracenest-worker  | Log worker ready
```

### 2. Seed demo data

```bash
docker compose exec api node scripts/seed.js
```

This creates a demo user (`demo@tracenest.dev` / `secret123`), a project, and 10,000 log entries.

---

## API Reference (Phase 1)

### Health Check
```bash
curl http://localhost:3000/health
```

### Auth

**Register**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Dev","email":"dev@test.com","password":"secret123"}'
```

**Login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@test.com","password":"secret123"}'
# → Returns { data: { token: "eyJ..." } }
```

**Get current user**
```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Projects

**Create project**
```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"My App","description":"Production API"}'
# → Returns { data: { project: {...}, apiKey: "tn_abc123..." } }
# ⚠️ Save the apiKey — it is shown ONCE and never stored in plaintext
```

**List projects**
```bash
curl http://localhost:3000/api/projects \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Log Ingestion (use X-API-Key from project creation)

**Single log**
```bash
curl -X POST http://localhost:3000/api/ingest \
  -H "X-API-Key: tn_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "level": "error",
    "message": "Database connection timeout",
    "method": "GET",
    "endpoint": "/api/results/42",
    "statusCode": 500,
    "durationMs": 5230,
    "stack": "Error: ETIMEDOUT\n    at Connection.connect..."
  }'
# → 202 { "data": { "queued": 1 } }
```

**Batch logs**
```bash
curl -X POST http://localhost:3000/api/ingest/batch \
  -H "X-API-Key: tn_abc123..." \
  -H "Content-Type: application/json" \
  -d '[
    {"level":"info","message":"Login OK","endpoint":"/login","statusCode":200,"durationMs":45},
    {"level":"warn","message":"Slow query","endpoint":"/api/grades","statusCode":200,"durationMs":1800}
  ]'
```

**NDJSON stream upload**
```bash
printf '{"level":"info","message":"line1","endpoint":"/a","statusCode":200,"durationMs":50}\n{"level":"error","message":"line2","endpoint":"/b","statusCode":500,"durationMs":3000}\n' \
  | curl -X POST http://localhost:3000/api/ingest/stream \
    -H "X-API-Key: tn_abc123..." \
    -H "Content-Type: application/x-ndjson" \
    --data-binary @-
```

---

## File Structure

```
tracenest/
├── docker-compose.yml
├── .env                  ← dev env (gitignored)
├── .env.example          ← committed template
├── .gitignore
├── README.md
├── scripts/
│   └── seed.js           ← inserts demo user + 10k logs
├── server/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app.js        ← Express app (routes, middleware)
│       ├── server.js     ← HTTP server entry point
│       ├── config/       ← env, db, redis
│       ├── models/       ← User, Project, Log, Alert, AlertRule
│       ├── routes/       ← auth, project, ingest
│       ├── controllers/  ← auth, project, ingest
│       ├── services/     ← ingest, alert
│       ├── middleware/   ← auth, apiKey, validate, errorHandler, rateLimit
│       ├── queues/       ← logQueue (BullMQ)
│       ├── workers/      ← logWorker (BullMQ consumer)
│       └── utils/        ← logger, events (EventEmitter), streamHelpers
└── docs/                 ← architecture, api, benchmarks (Phase 3)
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | API server port |
| `MONGO_URI` | `mongodb://mongo:27017/tracenest` | MongoDB connection string |
| `REDIS_HOST` | `redis` | Redis hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `JWT_SECRET` | — | **Required in production** |
| `JWT_EXPIRES_IN` | `7d` | JWT expiry |
| `LOG_TTL_DAYS` | `30` | Auto-delete logs older than N days |
| `WORKER_BATCH_SIZE` | `100` | Max docs per `insertMany` call |
| `WORKER_CONCURRENCY` | `5` | Parallel BullMQ jobs |
| `ALERT_WEBHOOK_URL` | — | Optional: POST alerts here |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18 |
| API framework | Express.js |
| Database | MongoDB 7 + Mongoose |
| Queue | Redis 7 + BullMQ |
| Auth | bcryptjs + jsonwebtoken |
| Container | Docker + Docker Compose |
| Frontend (Phase 2) | React + Vite + Recharts |

---

## Phases

- ✅ **Phase 1** — Docker infra, auth, projects, ingestion pipeline, worker, seed
- 🔜 **Phase 2** — Search API, analytics API, alerts, SDK, demo app, React dashboard
- 🔜 **Phase 3** — Benchmarks, index tuning, tests, full docs
