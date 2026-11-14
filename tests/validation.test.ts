import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';

const app = createApp();

describe('Middleware Validation & System Integrity', () => {
  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('should return 404 with structured error for unknown route', async () => {
    const res = await request(app).get('/api/v1/non-existent-route-xyz');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe('fail');
    expect(res.body.message).toContain('Cannot find endpoint');
  });

  it('should return 200 with active database status on /health', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.database.status).toBe('connected');
    expect(res.body.database.latencyMs).toBeTypeOf('number');
  });

  it('should reject invalid UUID route parameters (422)', async () => {
    const res = await request(app).get('/api/v1/products/not-a-valid-uuid');

    expect(res.status).toBe(422);
    expect(res.body.status).toBe('fail');
    expect(res.body.errors[0].field).toBe('id');
    expect(res.body.errors[0].message).toContain('valid UUID');
  });

  it('should handle malformed JSON payload gracefully (400)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "broken-json,');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Malformed JSON');
  });
});
