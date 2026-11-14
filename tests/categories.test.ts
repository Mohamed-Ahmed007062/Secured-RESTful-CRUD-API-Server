import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma, connectDatabase, disconnectDatabase } from '../src/config/database.js';

const app = createApp();

describe('Categories Endpoints & RBAC', () => {
  let adminToken = '';
  let userToken = '';
  let createdCategoryId = '';

  beforeAll(async () => {
    await connectDatabase();

    // Register an ADMIN
    const adminRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'cat-admin@example.com',
        password: 'AdminPassword123!',
        name: 'Admin User',
        role: 'ADMIN',
      });
    adminToken = adminRes.body.data.token;

    // Register a standard USER
    const userRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'cat-user@example.com',
        password: 'UserPassword123!',
        name: 'Regular User',
        role: 'USER',
      });
    userToken = userRes.body.data.token;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('should forbid standard USER from creating category (403)', async () => {
    const res = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'Forbidden Category',
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('does not have permission');
  });

  it('should allow ADMIN to create a category (201)', async () => {
    const res = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Serverless Compute',
        description: 'Functions and event-driven resources',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.slug).toBe('serverless-compute');
    createdCategoryId = res.body.data.id;
  });

  it('should reject category creation with duplicate name (409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Serverless Compute',
      });

    expect(res.status).toBe(409);
  });

  it('should list categories with pagination metadata (200)', async () => {
    const res = await request(app).get('/api/v1/categories?page=1&limit=10');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it('should retrieve single category by ID (200)', async () => {
    const res = await request(app).get(`/api/v1/categories/${createdCategoryId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdCategoryId);
  });

  it('should allow ADMIN to update category (200)', async () => {
    const res = await request(app)
      .put(`/api/v1/categories/${createdCategoryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Updated serverless platform description',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe('Updated serverless platform description');
  });

  it('should allow ADMIN to delete empty category (200)', async () => {
    const res = await request(app)
      .delete(`/api/v1/categories/${createdCategoryId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('deleted');
  });
});
