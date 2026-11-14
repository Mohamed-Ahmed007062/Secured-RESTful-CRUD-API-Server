import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma, connectDatabase, disconnectDatabase } from '../src/config/database.js';

const app = createApp();

describe('Authentication & User Flow', () => {
  beforeAll(async () => {
    await connectDatabase();
    // Clean database before tests
    await prisma.auditLog.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  const testUser = {
    email: 'tester@example.com',
    password: 'Password123!',
    name: 'Test Engineer',
    role: 'USER',
  };

  let authToken = '';

  it('should reject registration with invalid email format (422)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'invalid-email-address',
        password: 'Password123!',
        name: 'Tester',
      });

    expect(res.status).toBe(422);
    expect(res.body.status).toBe('fail');
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].field).toBe('email');
  });

  it('should reject registration with short password (422)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'valid@example.com',
        password: '123',
        name: 'Tester',
      });

    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe('password');
  });

  it('should successfully register a valid new user (201)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.passwordHash).toBeUndefined(); // ensure password hash not leaked!
    authToken = res.body.data.token;
  });

  it('should reject registration with duplicate email (409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.status).toBe('fail');
  });

  it('should reject login with wrong password (401)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: 'WrongPassword!',
      });

    expect(res.status).toBe(401);
  });

  it('should successfully log in with correct credentials (200)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('should retrieve authenticated user profile with valid Bearer token (200)', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('should reject profile request without token (401)', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
