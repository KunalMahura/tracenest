# TraceNest — Build Plan

> **Self-hosted log & performance monitoring platform** (mini Datadog/Sentry)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        External Apps                            │
│         (Demo App using SDK → POST /api/ingest)                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (API Key auth)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Express API Server                           │
│  /auth  /projects  /ingest  /logs  /analytics  /alerts  /sse    │
└───────────┬──────────────────────────────┬───────────────────────┘
            │ Push job                     │ Query / Aggregate
            ▼                              ▼
     ┌─────────────┐               ┌──────────────┐
     │    Redis    │               │   MongoDB    │
     │  (BullMQ)   │               │  (Mongoose)  │
     └──────┬──────┘               └──────────────┘
            │ Consume
            ▼
     ┌─────────────────┐
     │  Log Worker     │
     │  (BullMQ worker)│
     │  • batch insert │
     │  • alert eval   │
     │  • EventEmitter │
     └─────────────────┘
                           ▲ Poll/SSE
                           │
┌──────────────────────────────────────────────────────────────────┐
│                    React Dashboard (Vite)                        │
│  Login | Projects | Overview | Log Explorer | Alerts | Live Feed │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

1. **SDK** in host app batches log/request events → `POST /api/ingest/batch`
2. **Ingestion API** validates, authenticates by API key → pushes to **Redis/BullMQ queue** → responds `202`
3. **Log Worker** pulls batches, enriches, `insertMany` to **MongoDB**
4. **Worker** also evaluates alert rules via EventEmitter → stores triggered alerts / calls webhooks
5. **Dashboard** polls REST endpoints (or SSE) for live data

---

## Phase Breakdown

### ✅ Phase 1 — Day 1 (Foundation)
**Goal: Everything runs via `docker compose up`**

| Area | What we build |
|------|---------------|
| Infra | `docker-compose.yml` (mongo, redis, api, worker) |
| Server skeleton | `app.js`, `server.js`, config/, middleware/ |
| Auth | `POST /auth/register`, `POST /auth/login` (bcrypt + JWT) |
| Projects & API keys | CRUD + random API key generation |
| Ingestion API | `POST /api/ingest`, `POST /api/ingest/batch`, NDJSON stream upload |
| Redis Queue | BullMQ `logQueue`, push on ingest |
| Log Worker | BullMQ worker → batch insertMany → MongoDB |
| Models | User, Project, Log, Alert, AlertRule (with all indexes + TTL) |
| Seed script | `scripts/seed.js` — creates user, project, inserts 10k logs |
| `.env.example`, `.gitignore` | Ready for GitHub |

**Done when:** `docker compose up` → seed → curl ingest → see logs in Mongo

---

### 📊 Phase 2 — Day 2 (Features)
**Goal: Full API + Dashboard + SDK**

| Area | What we build |
|------|---------------|
| Search API | `GET /api/logs` — filter level/endpoint/status/time/keyword, paginated |
| Analytics API | `GET /api/analytics/*` — req/min, error rate, p50/p95/p99, top failing, slowest |
| Alerts | Alert rules engine, triggered alert storage, webhook call, SSE stream |
| SDK | `/sdk/index.js` — Express middleware, batch flush every N sec/items |
| Demo app | `/demo-app` — fake college results site, random slow/fail routes + SDK |
| React Dashboard | Login, project selector, overview charts (Recharts), log explorer, alerts page |

**Done when:** SDK plugged into demo app → logs flow → dashboard shows live data

---

### 🏁 Phase 3 — Day 3 (Polish & Benchmarks)
**Goal: Production-ready docs + performance proof**

| Area | What we build |
|------|---------------|
| Benchmarks | `seed-logs.js` (1M logs), `load-ingest.js` (autocannon), `search-bench.js` |
| Index tuning | Add/verify compound + text + TTL indexes, explain plans |
| Tests | Jest + supertest for auth, ingest, search, analytics routes |
| README | Setup, architecture diagram, API reference, dev guide |
| Docs | `docs/api.md`, `docs/architecture.md`, `docs/benchmark-results.md` |
| Postman collection | `docs/TraceNest.postman_collection.json` |
| Demo script | Shell script or npm script that wires everything for a live demo |

---

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Queue | BullMQ + Redis | Decouples ingestion from DB writes; survives traffic spikes |
| Batch writes | `insertMany` in worker | 10-50x faster than individual inserts under load |
| Auth | JWT Bearer | Stateless, easy to add to SDK |
| API key auth | SHA-256 hashed key in DB | Fast lookup, API keys never stored in plaintext |
| Indexes | Compound (projectId+timestamp), text(message), TTL | Covers all query patterns |
| Dashboard refresh | Polling (5s) + SSE for alerts | Simple to implement, no WebSocket overhead |
| Error isolation | SDK never throws | Host app must never crash due to monitoring |

---

## File Structure (strict)

```
tracenest/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── benchmark-results.md
│   └── TraceNest.postman_collection.json
├── server/
│   ├── package.json
│   ├── Dockerfile
│   └── src/
│       ├── app.js
│       ├── server.js
│       ├── config/
│       │   ├── env.js
│       │   ├── db.js
│       │   └── redis.js
│       ├── models/
│       │   ├── User.js
│       │   ├── Project.js
│       │   ├── Log.js
│       │   ├── Alert.js
│       │   └── AlertRule.js
│       ├── routes/
│       │   ├── auth.routes.js
│       │   ├── project.routes.js
│       │   ├── ingest.routes.js
│       │   ├── log.routes.js
│       │   ├── analytics.routes.js
│       │   └── alert.routes.js
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── project.controller.js
│       │   ├── ingest.controller.js
│       │   ├── log.controller.js
│       │   ├── analytics.controller.js
│       │   └── alert.controller.js
│       ├── services/
│       │   ├── ingest.service.js
│       │   ├── search.service.js
│       │   ├── analytics.service.js
│       │   └── alert.service.js
│       ├── middleware/
│       │   ├── auth.middleware.js
│       │   ├── apiKey.middleware.js
│       │   ├── validate.middleware.js
│       │   ├── errorHandler.middleware.js
│       │   └── rateLimit.middleware.js
│       ├── queues/
│       │   └── logQueue.js
│       ├── workers/
│       │   └── logWorker.js
│       ├── utils/
│       │   ├── logger.js
│       │   ├── events.js
│       │   └── streamHelpers.js
│       └── tests/
│           ├── auth.test.js
│           ├── ingest.test.js
│           └── analytics.test.js
├── client/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── pages/
│       ├── components/
│       ├── hooks/
│       └── services/api.js
├── sdk/
│   ├── package.json
│   └── index.js
├── demo-app/
│   ├── package.json
│   └── index.js
├── benchmarks/
│   ├── seed-logs.js
│   ├── load-ingest.js
│   └── search-bench.js
└── scripts/
    └── seed.js
```

---

## Phase 1 Deliverable Test Commands

```bash
# Start everything
docker compose up --build

# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Dev","email":"dev@test.com","password":"secret123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@test.com","password":"secret123"}'

# Create project (use JWT from login)
curl -X POST http://localhost:3000/api/projects \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"name":"My App"}'

# Ingest a single log (use apiKey from project)
curl -X POST http://localhost:3000/api/ingest \
  -H "X-API-Key: <apiKey>" \
  -H "Content-Type: application/json" \
  -d '{"level":"error","message":"DB timeout","endpoint":"/results/1","statusCode":500,"durationMs":3200}'

# Batch ingest
curl -X POST http://localhost:3000/api/ingest/batch \
  -H "X-API-Key: <apiKey>" \
  -H "Content-Type: application/json" \
  -d '[{"level":"info","message":"ok","endpoint":"/results/2","statusCode":200,"durationMs":45}]'

# Run seed script
docker compose exec api node scripts/seed.js
```
