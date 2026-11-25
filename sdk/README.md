# @tracenest/sdk

Zero-dependency Node.js SDK for [TraceNest](https://github.com/KunalMahura/tracenest): request tracing, structured logs and error monitoring for **Express**, **plain `node:http`**, and anything else that runs on Node.

- No dependencies, only Node's own `http`/`https`
- Batches logs in memory and sends them in the background, so it never blocks your requests
- If TraceNest is unreachable, logs are retried later. The buffer has a size cap, so an outage can't use up your app's memory
- Never throws from logging calls, and never takes over your process signals
- TypeScript types included

## 1. Get an API key

1. Sign up on your TraceNest dashboard.
2. Open **Projects**, then **New project**.
3. Copy the API key (`tn_…`). It's shown **once**.

## 2. Install

```bash
npm install @tracenest/sdk
```

```bash
# .env
TRACENEST_API_KEY=tn_your_key_here
TRACENEST_HOST=https://your-tracenest-api.example.com
```

## 3. Add it to your app

### Express (2 lines)

```js
const { tracenest } = require('@tracenest/sdk');
app.use(tracenest({ apiKey: process.env.TRACENEST_API_KEY, host: process.env.TRACENEST_HOST }));
```

Register it **before** your routes. Each request is recorded with method, route (`/users/:id`), status code and duration. 5xx responses are logged as `error`, and 4xx responses as `warn`.

To also capture stack traces of errors thrown in routes, add the error handler **after** your routes:

```js
const mw = tracenest({ apiKey: process.env.TRACENEST_API_KEY, host: process.env.TRACENEST_HOST });
app.use(mw);
// ...routes...
app.use(mw.client.errorHandler()); // records the error, then calls next(err)
```

### Plain `node:http`

```js
const http = require('http');
const { createClient } = require('@tracenest/sdk');

const tn = createClient({ apiKey: process.env.TRACENEST_API_KEY, host: process.env.TRACENEST_HOST });

http.createServer(tn.wrap((req, res) => {
  res.end('hello');
})).listen(3000);
```

### Fastify, Koa, Next.js API routes and others

All of these run on Node's `http` module, so pass the raw request and response objects to `trackRequest`:

```js
// Fastify
fastify.addHook('onRequest', async (request, reply) => tn.trackRequest(request.raw, reply.raw));

// Koa
app.use(async (ctx, next) => { tn.trackRequest(ctx.req, ctx.res); await next(); });
```

### Logging any event

Use these anywhere: background jobs, queues, cron tasks, CLIs.

```js
tn.info('User signed up', { userId: 42 });
tn.warn('Cache miss storm', { hitRate: 0.12 });
tn.error('Payment failed', { orderId: 'A-1009' });

tn.captureException(err, { jobId });     // logs err with its stack trace

tn.capture({                              // full control over every field
  level: 'warn',
  message: 'Slow query',
  endpoint: 'db:users.find',
  durationMs: 812,
  meta: { rows: 5000 },
});
```

Or set up one shared client and import the helpers from anywhere:

```js
const tracenestSdk = require('@tracenest/sdk');
tracenestSdk.init({ apiKey: process.env.TRACENEST_API_KEY, host: process.env.TRACENEST_HOST });

// elsewhere
const { info, captureException } = require('@tracenest/sdk');
info('Job finished', { durationMs: 1200 });
```

### Graceful shutdown

Logs are flushed every 5 seconds and when the process exits on its own. If you handle `SIGTERM` yourself, flush before exiting:

```js
process.on('SIGTERM', async () => {
  await tn.shutdown();   // sends everything still buffered
  process.exit(0);
});
```

## Options

| Option          | Default                                  | Description |
|-----------------|------------------------------------------|-------------|
| `apiKey`        | `TRACENEST_API_KEY`                      | Project API key. **Required.** |
| `host`          | `TRACENEST_HOST`, then `http://localhost:3000` | Base URL of the TraceNest API. |
| `service`       | `TRACENEST_SERVICE`                      | Added to every log as `meta.service`. |
| `environment`   | `NODE_ENV`                               | Added to every log as `meta.environment`. |
| `flushInterval` | `5000`                                   | Milliseconds between flushes. |
| `batchSize`     | `50`                                     | Flush early once this many logs are buffered (max 1000). |
| `maxBufferSize` | `10000`                                  | Logs held in memory. The oldest are dropped beyond this. |
| `timeout`       | `5000`                                   | HTTP timeout in milliseconds. |
| `ignorePaths`   | `['/health', '/healthz', '/favicon.ico']` | Request paths that are never recorded. |
| `enabled`       | `true`                                   | `false` turns the SDK into a no-op (useful in tests). |
| `debug`         | `false`                                  | Print SDK diagnostics to stderr. |
| `onError`       | none                                     | `(err) => void`, called when a batch fails to send. |

## Quotas

Each project has a daily log quota, 10,000 by default, which resets at UTC midnight. Every ingest response includes these headers:

```
X-Quota-Limit: 10000
X-Quota-Used: 2341
X-Quota-Remaining: 7659
X-Quota-Reset: 2026-11-25T00:00:00.000Z
```

When the quota runs out, the API returns `429` and the SDK drops that batch instead of retrying it. To see the latest quota and how many logs were dropped, call `tn.stats()`.

## Without the SDK

The SDK is optional. Any language can send logs over HTTP:

```bash
curl -X POST "$TRACENEST_HOST/api/ingest/batch" \
  -H "X-API-Key: $TRACENEST_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"logs":[{"level":"info","message":"Hello from curl","endpoint":"/hello","statusCode":200,"durationMs":12}]}'
```

## License

MIT
