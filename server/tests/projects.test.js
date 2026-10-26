'use strict';

const request = require('supertest');
const app = require('../src/app');
const { setupTestDB, clearTestCollections, teardownTestDB } = require('./helpers');

let token;
let userEmail = `proj_${Date.now()}@test-tracenest.com`;

beforeAll(async () => {
  await setupTestDB();
  const reg = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Project Tester',
      email: userEmail,
      password: 'password123',
    });
  token = reg.body.data.token;
});

afterAll(async () => {
  await teardownTestDB();
});

describe('Projects API (/api/projects)', () => {
  it('should create a new project and return a raw API key prefixed with tn_', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'TEST_Project_Alpha',
        description: 'Testing project creation',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.project.name).toBe('TEST_Project_Alpha');
    expect(res.body.data.apiKey).toBeDefined();
    expect(res.body.data.apiKey.startsWith('tn_')).toBe(true);
  });

  it('should list all projects belonging to the user', async () => {
    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'TEST_Project_1' });

    await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'TEST_Project_2' });

    const res = await request(app)
      .get('/api/projects')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.projects.length).toBeGreaterThanOrEqual(2);
  });

  it('should regenerate project API key', async () => {
    const created = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'TEST_Project_KeyRegen' });

    const projId = created.body.data.project._id;
    const oldKey = created.body.data.apiKey;

    const regen = await request(app)
      .post(`/api/projects/${projId}/regenerate-key`)
      .set('Authorization', `Bearer ${token}`);

    expect(regen.status).toBe(200);
    expect(regen.body.success).toBe(true);
    expect(regen.body.data.apiKey).toBeDefined();
    expect(regen.body.data.apiKey).not.toBe(oldKey);
  });
});
