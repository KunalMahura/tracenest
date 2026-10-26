'use strict';

const request = require('supertest');
const app = require('../src/app');
const { setupTestDB, clearTestCollections, teardownTestDB } = require('./helpers');

let apiKey;
let token;
let projectId;

beforeAll(async () => {
  await setupTestDB();
  const reg = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Ingest Tester',
      email: `ingest_${Date.now()}@test-tracenest.com`,
      password: 'password123',
    });
  token = reg.body.data.token;

  const proj = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'TEST_Ingest_App' });

  apiKey = proj.body.data.apiKey;
  projectId = proj.body.data.project._id;
});

afterAll(async () => {
  await teardownTestDB();
});

describe('Log Ingestion API (/api/ingest)', () => {
  it('should accept a single valid log entry and return 202 with queued count', async () => {
    const res = await request(app)
      .post('/api/ingest')
      .set('X-API-Key', apiKey)
      .send({
        level: 'info',
        message: 'User logged in successfully',
        endpoint: '/api/v1/auth/login',
        method: 'POST',
        statusCode: 200,
        durationMs: 42,
      });

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.queued).toBe(1);
  });

  it('should reject request when X-API-Key is missing or invalid', async () => {
    const missingKey = await request(app)
      .post('/api/ingest')
      .send({ level: 'info', message: 'test' });
    expect(missingKey.status).toBe(401);

    const badKey = await request(app)
      .post('/api/ingest')
      .set('X-API-Key', 'tn_badkey1234567890abcdef')
      .send({ level: 'info', message: 'test' });
    expect(badKey.status).toBe(401);
  });

  it('should accept a batch of logs via POST /api/ingest/batch', async () => {
    const logs = [
      { level: 'info', message: 'First request', endpoint: '/test1', statusCode: 200, durationMs: 10 },
      { level: 'warn', message: 'Slow query', endpoint: '/test2', statusCode: 200, durationMs: 450 },
      { level: 'error', message: 'Unhandled exception', endpoint: '/test3', statusCode: 500, durationMs: 120 },
    ];

    const res = await request(app)
      .post('/api/ingest/batch')
      .set('X-API-Key', apiKey)
      .send(logs);

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.queued).toBe(3);
  });

  it('should reject batch exceeding maximum allowed limit', async () => {
    // 1001 logs exceeds MAX_BATCH of 1000
    const oversizedBatch = Array.from({ length: 1001 }, (_, i) => ({
      level: 'info',
      message: `Log #${i}`,
    }));

    const res = await request(app)
      .post('/api/ingest/batch')
      .set('X-API-Key', apiKey)
      .send(oversizedBatch);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('exceeds maximum');
  });
});
