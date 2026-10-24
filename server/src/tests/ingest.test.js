'use strict';

/**
 * Phase 1 ingest route tests.
 * Tests the single, batch, and stream ingest endpoints.
 * Run: docker compose exec api npm test
 */

const request  = require('supertest');
const mongoose = require('mongoose');

const app     = require('../app');
const User    = require('../models/User');
const Project = require('../models/Project');

const TEST_DB = process.env.MONGO_URI?.replace('/tracenest', '/tracenest_test')
  || 'mongodb://localhost:27017/tracenest_test';

let apiKey;
let project;

beforeAll(async () => {
  await mongoose.connect(TEST_DB);

  // Create test user + project
  const user = await User.create({
    name: 'Ingest Tester',
    email: 'ingest@example.com',
    passwordHash: 'secret123',
  });

  const { rawKey, hash, prefix } = Project.generateApiKey();
  apiKey = rawKey;

  project = await Project.create({
    userId:       user._id,
    name:         'Test Project',
    apiKeyHash:   hash,
    apiKeyPrefix: prefix,
  });
});

afterAll(async () => {
  await User.deleteMany({});
  await Project.deleteMany({});
  await mongoose.disconnect();
});

describe('POST /api/ingest', () => {
  it('accepts a single log and returns 202', async () => {
    const res = await request(app)
      .post('/api/ingest')
      .set('X-API-Key', apiKey)
      .send({
        level:      'error',
        message:    'Test error',
        endpoint:   '/api/test',
        statusCode: 500,
        durationMs: 1234,
      })
      .expect(202);

    expect(res.body.success).toBe(true);
    expect(res.body.data.queued).toBe(1);
  });

  it('returns 401 with missing API key', async () => {
    await request(app)
      .post('/api/ingest')
      .send({ level: 'info', message: 'test' })
      .expect(401);
  });

  it('returns 401 with invalid API key', async () => {
    await request(app)
      .post('/api/ingest')
      .set('X-API-Key', 'tn_invalidkey123')
      .send({ level: 'info', message: 'test' })
      .expect(401);
  });
});

describe('POST /api/ingest/batch', () => {
  it('accepts an array of logs and returns 202', async () => {
    const logs = Array.from({ length: 5 }, (_, i) => ({
      level:      i % 3 === 0 ? 'error' : 'info',
      message:    `Batch log ${i}`,
      endpoint:   '/api/batch',
      statusCode: i % 3 === 0 ? 500 : 200,
      durationMs: 50 + i * 10,
    }));

    const res = await request(app)
      .post('/api/ingest/batch')
      .set('X-API-Key', apiKey)
      .send(logs)
      .expect(202);

    expect(res.body.success).toBe(true);
    expect(res.body.data.queued).toBe(5);
  });

  it('returns 400 when batch exceeds 1000 entries', async () => {
    const logs = Array.from({ length: 1001 }, () => ({
      level: 'info', message: 'x',
    }));

    await request(app)
      .post('/api/ingest/batch')
      .set('X-API-Key', apiKey)
      .send(logs)
      .expect(400);
  });
});
