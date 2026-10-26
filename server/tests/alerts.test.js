'use strict';

const request = require('supertest');
const app = require('../src/app');
const Alert = require('../src/models/Alert');
const { setupTestDB, clearTestCollections, teardownTestDB } = require('./helpers');

let token;
let projectId;

beforeAll(async () => {
  await setupTestDB();
  const reg = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Alerts Tester',
      email: `alerts_${Date.now()}@test-tracenest.com`,
      password: 'password123',
    });
  token = reg.body.data.token;

  const proj = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'TEST_Alerts_App' });

  projectId = proj.body.data.project._id;
});

afterAll(async () => {
  await teardownTestDB();
});

describe('Alerts API (/api/alerts)', () => {
  it('should create an alert rule for high error rate', async () => {
    const res = await request(app)
      .post('/api/alerts/rules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectId,
        name: 'TEST_High_Error_Rate',
        conditionType: 'error_rate',
        threshold: 5,
        windowMinutes: 5,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('TEST_High_Error_Rate');
    expect(res.body.data.threshold).toBe(5);
  });

  it('should list all alert rules for a project', async () => {
    await request(app)
      .post('/api/alerts/rules')
      .set('Authorization', `Bearer ${token}`)
      .send({
        projectId,
        name: 'TEST_Rule_1',
        conditionType: 'request_count',
        threshold: 10,
        windowMinutes: 1,
      });

    const res = await request(app)
      .get(`/api/alerts/rules?projectId=${projectId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should resolve a triggered alert', async () => {
    const triggered = await Alert.create({
      projectId,
      ruleName: 'TEST_Breach',
      value: 15,
      threshold: 5,
      message: 'Error rate at 15% exceeded threshold of 5%',
    });

    const res = await request(app)
      .patch(`/api/alerts/${triggered._id}/resolve`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.resolved).toBe(true);
    expect(res.body.data.resolvedAt).toBeDefined();
  });
});
