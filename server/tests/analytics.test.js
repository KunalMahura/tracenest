'use strict';

const request = require('supertest');
const app = require('../src/app');
const Log = require('../src/models/Log');
const { setupTestDB, clearTestCollections, teardownTestDB } = require('./helpers');

let token;
let projectId;

beforeAll(async () => {
  await setupTestDB();
  const reg = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Analytics Tester',
      email: `analytics_${Date.now()}@test-tracenest.com`,
      password: 'password123',
    });
  token = reg.body.data.token;

  const proj = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'TEST_Analytics_App' });

  projectId = proj.body.data.project._id;

  // Insert mock logs directly into MongoDB for deterministic analytics testing
  const now = new Date();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const testLogs = [
    { projectId, level: 'info',  statusCode: 200, durationMs: 50,  endpoint: '/api/users', method: 'GET', timestamp: now, expiresAt, message: 'OK' },
    { projectId, level: 'info',  statusCode: 200, durationMs: 120, endpoint: '/api/users', method: 'GET', timestamp: now, expiresAt, message: 'OK' },
    { projectId, level: 'warn',  statusCode: 200, durationMs: 500, endpoint: '/api/items', method: 'GET', timestamp: now, expiresAt, message: 'Slow' },
    { projectId, level: 'error', statusCode: 500, durationMs: 300, endpoint: '/api/crash', method: 'POST', timestamp: now, expiresAt, message: 'Database failed' },
    { projectId, level: 'error', statusCode: 500, durationMs: 350, endpoint: '/api/crash', method: 'POST', timestamp: now, expiresAt, message: 'Timeout' },
  ];
  await Log.insertMany(testLogs);
});

afterAll(async () => {
  await teardownTestDB();
});

describe('Analytics & Logs API (/api/analytics, /api/logs)', () => {
  describe('GET /api/analytics/overview', () => {
    it('should calculate stats, error rate, and latency percentiles accurately', async () => {
      const res = await request(app)
        .get(`/api/analytics/overview?projectId=${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.totalRequests).toBe(5);
      expect(data.errorCount).toBe(2);
      expect(data.errorRate).toBe(40); // 2 out of 5 = 40%
      expect(data.p50).toBeGreaterThan(0);
      expect(data.p95).toBeGreaterThanOrEqual(data.p50);
      expect(data.p99).toBeGreaterThanOrEqual(data.p95);
    });
  });

  describe('GET /api/analytics/top-endpoints', () => {
    it('should rank endpoints by average latency', async () => {
      const res = await request(app)
        .get(`/api/analytics/top-endpoints?projectId=${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].endpoint).toBe('/api/items');
    });
  });

  describe('GET /api/analytics/top-failing', () => {
    it('should return top failing endpoints with error counts', async () => {
      const res = await request(app)
        .get(`/api/analytics/top-failing?projectId=${projectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].endpoint).toBe('/api/crash');
      expect(res.body.data[0].errors).toBe(2);
    });
  });

  describe('GET /api/logs', () => {
    it('should filter logs by level and return paginated results', async () => {
      const res = await request(app)
        .get(`/api/logs?projectId=${projectId}&level=error`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.logs.length).toBe(2);
      expect(res.body.data.logs.every((l) => l.level === 'error')).toBe(true);
    });

    it('should search logs by keyword in message', async () => {
      const res = await request(app)
        .get(`/api/logs?projectId=${projectId}&q=Timeout`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.logs.length).toBe(1);
      expect(res.body.data.logs[0].message).toContain('Timeout');
    });
  });
});
