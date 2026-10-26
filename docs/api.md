# TraceNest — REST API Reference

Base URL: `http://localhost:3000`

---

## Authentication

### 1. Register User
`POST /api/auth/register`
Creates a new developer account.

**Request Body:**
```json
{
  "name": "Jane Developer",
  "email": "jane@company.com",
  "password": "strongPassword123"
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOi...",
    "user": {
      "_id": "6adcf5799759bc500c5d74ca",
      "name": "Jane Developer",
      "email": "jane@company.com"
    }
  }
}
```

### 2. Login
`POST /api/auth/login`
Authenticates and returns a JWT token.

**Request Body:**
```json
{
  "email": "jane@company.com",
  "password": "strongPassword123"
}
```

---

## Projects Management

All project endpoints require the header: `Authorization: Bearer <JWT>`

### 1. Create Project
`POST /api/projects`

**Request Body:**
```json
{
  "name": "Payment Gateway Service",
  "description": "Production billing and checkout APIs"
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "project": {
      "_id": "6adcf5799759bc500c5d74cb",
      "name": "Payment Gateway Service",
      "apiKeyPrefix": "tn_4233af"
    },
    "apiKey": "tn_4233af265068abcd1cf88e0c8c027db8cb7a292926c3f7df",
    "warning": "Store your API key now — it cannot be retrieved again"
  }
}
```

### 2. List Projects
`GET /api/projects`
Returns all projects belonging to the current user.

### 3. Regenerate API Key
`POST /api/projects/:id/regenerate-key`
Invalidates the existing key and generates a new secret.

---

## Log Ingestion

All ingest endpoints require the header: `X-API-Key: <apiKey>`

### 1. Ingest Single Log
`POST /api/ingest`

**Request Body:**
```json
{
  "level": "error",
  "message": "Payment gateway timeout after 5000ms",
  "endpoint": "/api/checkout",
  "method": "POST",
  "statusCode": 504,
  "durationMs": 5002.4,
  "stack": "Error: Timeout at Gateway.charge...",
  "meta": { "userId": 4281, "cartId": "cart_991" }
}
```
**Response (202 Accepted):**
```json
{
  "success": true,
  "data": { "queued": 1 }
}
```

### 2. Batch Ingest
`POST /api/ingest/batch`
Accepts an array of up to 1,000 log objects.

**Response (202 Accepted):**
```json
{
  "success": true,
  "data": { "queued": 50 }
}
```

### 3. NDJSON Stream Ingest
`POST /api/ingest/stream`
Stream newline-delimited JSON payloads directly into the parser without buffering memory.

---

## Log Explorer & Search

Requires header: `Authorization: Bearer <JWT>`

### `GET /api/logs`
**Query Parameters:**
| Parameter | Type | Default | Description |
|---|---|---|---|
| `projectId` | String | *required* | Target project ID |
| `range` | String | `1h` | Named range: `15m`, `1h`, `6h`, `24h`, `7d`, `30d` |
| `level` | String | *optional* | Filter: `error`, `warn`, `info`, `debug` |
| `statusCode` | Number | *optional* | Filter by exact status code (e.g. `500`) |
| `q` | String | *optional* | Full-text substring search across messages |
| `cursor` | String | *optional* | Keyset cursor for next page pagination |
| `limit` | Number | `50` | Maximum items to return (max 200) |

---

## Analytics & Aggregations

Requires header: `Authorization: Bearer <JWT>`

### 1. Overview Summary
`GET /api/analytics/overview?projectId=<id>&range=1h`
Returns total request count, error count, error rate percentage, and p50, p95, p99 latency percentiles.

### 2. Request Throughput Time-Series
`GET /api/analytics/throughput?projectId=<id>&range=1h&buckets=30`
Returns time-bucketed request and error counts for area charts.

### 3. Top Slowest Endpoints
`GET /api/analytics/top-endpoints?projectId=<id>&range=1h&limit=10`
Returns routes ranked by highest average latency.

### 4. Top Failing Endpoints
`GET /api/analytics/top-failing?projectId=<id>&range=1h&limit=10`
Returns routes ranked by total error occurrences.

---

## Alerts

Requires header: `Authorization: Bearer <JWT>`

### 1. Create Alert Rule
`POST /api/alerts/rules`

**Request Body:**
```json
{
  "projectId": "6adcf5799759bc500c5d74ca",
  "name": "High Error Rate (>5%)",
  "conditionType": "error_rate",
  "threshold": 5,
  "windowMinutes": 5,
  "webhookUrl": "https://hooks.slack.com/services/..."
}
```

### 2. List Alert Rules
`GET /api/alerts/rules?projectId=<id>`

### 3. List Triggered Alerts
`GET /api/alerts?projectId=<id>&resolved=false`

### 4. Resolve Alert
`PATCH /api/alerts/:id/resolve`

---

## Real-Time SSE Stream

### `GET /api/sse?projectId=<id>&token=<jwt>`
Establishes a persistent Server-Sent Events connection. Emits:
- `event: log` — Real-time incoming logs.
- `event: alert` — Fired when an alert rule condition is breached.
