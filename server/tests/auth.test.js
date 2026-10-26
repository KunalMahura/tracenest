'use strict';

const request = require('supertest');
const app = require('../src/app');
const { setupTestDB, clearTestCollections, teardownTestDB } = require('./helpers');

beforeAll(async () => {
  await setupTestDB();
});

beforeEach(async () => {
  await clearTestCollections();
});

afterAll(async () => {
  await teardownTestDB();
});

describe('Authentication API (/api/auth)', () => {
  const testUser = {
    name: 'Test Engineer',
    email: 'engineer@test-tracenest.com',
    password: 'password123',
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user and return token + user info', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should reject registration if email is already taken', async () => {
      await request(app).post('/api/auth/register').send(testUser);

      const duplicate = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      expect(duplicate.status).toBe(409);
      expect(duplicate.body.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid',
          email: 'not-an-email',
          password: 'pass',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(testUser);
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('should reject incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user profile when authenticated', async () => {
      const reg = await request(app).post('/api/auth/register').send(testUser);
      const token = reg.body.data.token;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
