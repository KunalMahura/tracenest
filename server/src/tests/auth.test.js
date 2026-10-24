'use strict';

/**
 * Phase 1 auth route tests.
 * Run: docker compose exec api npm test
 */

const request  = require('supertest');
const mongoose = require('mongoose');

const app = require('../app');
const User = require('../models/User');

// Use a separate test DB
const TEST_DB = process.env.MONGO_URI?.replace('/tracenest', '/tracenest_test')
  || 'mongodb://localhost:27017/tracenest_test';

beforeAll(async () => {
  await mongoose.connect(TEST_DB);
  await User.deleteMany({}); // Clean slate
});

afterAll(async () => {
  await User.deleteMany({});
  await mongoose.disconnect();
});

describe('POST /api/auth/register', () => {
  it('creates a new user and returns a JWT', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'secret123' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
    expect(res.body.data.user).toHaveProperty('email', 'test@example.com');
    expect(res.body.data.user).not.toHaveProperty('passwordHash');
  });

  it('returns 409 on duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dupe', email: 'test@example.com', password: 'secret123' })
      .expect(409);

    expect(res.body.success).toBe(false);
  });

  it('returns 422 on invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Bad', email: 'not-an-email', password: 'secret123' })
      .expect(422);

    expect(res.body.success).toBe(false);
    expect(res.body.details).toBeDefined();
  });

  it('returns 422 when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Short', email: 'short@example.com', password: 'abc' })
      .expect(422);

    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/login', () => {
  it('returns JWT on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'secret123' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('token');
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpassword' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });

  it('returns 401 on unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'secret123' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/auth/me', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'secret123' });
    token = res.body.data.token;
  });

  it('returns user profile with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe('test@example.com');
  });

  it('returns 401 without token', async () => {
    await request(app).get('/api/auth/me').expect(401);
  });
});
