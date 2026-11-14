import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma, connectDatabase, disconnectDatabase } from '../src/config/database.js';

const app = createApp();

describe('Products CRUD & Secured Mutations', () => {
  let adminToken = '';
  let userToken = '';
  let otherUserToken = '';
  let categoryId = '';
  let createdProductId = '';
  const timestamp = Date.now();

  beforeAll(async () => {
    await connectDatabase();

    // 1. Register an Admin for this test suite
    const adminRes = await request(app).post('/api/v1/auth/register').send({
      email: `prod-admin-${timestamp}@example.com`,
      password: 'AdminPassword123!',
      name: 'Prod Admin',
      role: 'ADMIN',
    });
    adminToken = adminRes.body.data.token;

    // 2. Register User
    const userRes = await request(app).post('/api/v1/auth/register').send({
      email: `prod-user-${timestamp}@example.com`,
      password: 'UserPassword123!',
      name: 'Prod User',
      role: 'USER',
    });
    userToken = userRes.body.data.token;

    // 3. Register a second user to test unauthorized modification attempts
    const otherRes = await request(app).post('/api/v1/auth/register').send({
      email: `prod-intruder-${timestamp}@example.com`,
      password: 'IntruderPass123!',
      name: 'Intruder User',
    });
    otherUserToken = otherRes.body.data.token;

    // 4. Create a Category with Admin Token
    const catRes = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: `Distributed Cloud Storage ${timestamp}`,
        description: 'Scalable S3-compatible block and object storage',
      });
    categoryId = catRes.body.data.id;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('should reject product creation without authentication (401)', async () => {
    const res = await request(app).post('/api/v1/products').send({
      title: 'Unauthenticated Product',
      price: 99.99,
      sku: `UNAUTH-${timestamp}`,
      categoryId,
    });

    expect(res.status).toBe(401);
  });

  it('should reject product creation with invalid payload (422)', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'A', // Too short (min 2)
        price: -50, // Negative price invalid
        sku: 'AB', // SKU too short (min 3)
        categoryId: 'not-a-uuid',
      });

    expect(res.status).toBe(422);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('should reject product creation when referenced category does not exist (400)', async () => {
    const nonExistentUuid = '00000000-0000-0000-0000-000000000000';
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Orphaned Product',
        price: 99.99,
        sku: `ORPHAN-${timestamp}`,
        categoryId: nonExistentUuid,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Referenced category with ID');
  });

  it('should successfully create a product with relational mapping and audit logging (201)', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: `Redis In-Memory Accelerator ${timestamp}`,
        description: 'Sub-millisecond low latency caching tier',
        price: 39.95,
        stock: 40,
        status: 'ACTIVE',
        sku: `REDIS-${timestamp}`,
        categoryId,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.category).toBeDefined();
    expect(res.body.data.creator).toBeDefined();
    createdProductId = res.body.data.id;

    // Verify audit log created in database
    const log = await prisma.auditLog.findFirst({
      where: { entityId: createdProductId, action: 'CREATE_PRODUCT' },
    });
    expect(log).toBeDefined();
    expect(log?.entity).toBe('Product');
  });

  it('should reject product creation with duplicate SKU (409 Conflict)', async () => {
    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Duplicate SKU Product',
        price: 50,
        sku: `REDIS-${timestamp}`, // Same SKU
        categoryId,
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already exists');
  });

  it('should list products with query filters, pagination, and sorting (200)', async () => {
    const res = await request(app)
      .get('/api/v1/products?page=1&limit=5&status=ACTIVE&sortBy=price&sortOrder=asc');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(5);
  });

  it('should filter products by search term (200)', async () => {
    const res = await request(app).get('/api/v1/products?search=Redis');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should retrieve single product by ID with relations (200)', async () => {
    const res = await request(app).get(`/api/v1/products/${createdProductId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdProductId);
    expect(res.body.data.category.id).toBe(categoryId);
  });

  it('should forbid non-owner non-admin from modifying product (403)', async () => {
    const res = await request(app)
      .patch(`/api/v1/products/${createdProductId}`)
      .set('Authorization', `Bearer ${otherUserToken}`)
      .send({
        price: 9.99,
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('do not have permission');
  });

  it('should allow resource creator to update their product (200)', async () => {
    const res = await request(app)
      .patch(`/api/v1/products/${createdProductId}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        price: 45.00,
        stock: 55,
      });

    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(45.00);
    expect(res.body.data.stock).toBe(55);
  });

  it('should allow ADMIN to delete any product (200)', async () => {
    const res = await request(app)
      .delete(`/api/v1/products/${createdProductId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('deleted successfully');

    // Confirm product is deleted
    const check = await request(app).get(`/api/v1/products/${createdProductId}`);
    expect(check.status).toBe(404);
  });
});
