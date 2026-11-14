import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Clean existing records in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users (Admin & Standard User)
  const salt = 12;
  const adminPasswordHash = await bcrypt.hash('AdminPass123!', salt);
  const userPasswordHash = await bcrypt.hash('UserPass123!', salt);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'System Administrator',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  const regularUser = await prisma.user.create({
    data: {
      email: 'user@example.com',
      name: 'Regular Developer',
      passwordHash: userPasswordHash,
      role: 'USER',
    },
  });

  console.log('👤 Created Users:', { admin: admin.email, user: regularUser.email });

  // 3. Create Categories
  const catCompute = await prisma.category.create({
    data: {
      name: 'Cloud Compute',
      slug: 'cloud-compute',
      description: 'High-performance CPU, GPU, and memory-optimized virtual instances',
    },
  });

  const catDatabase = await prisma.category.create({
    data: {
      name: 'Managed Databases',
      slug: 'managed-databases',
      description: 'Fully managed relational SQL and distributed database engines',
    },
  });

  const catSecurity = await prisma.category.create({
    data: {
      name: 'Network & Security',
      slug: 'network-security',
      description: 'Enterprise firewalls, DDoS mitigation, and SSL gateway management',
    },
  });

  console.log('📁 Created Categories:', [catCompute.name, catDatabase.name, catSecurity.name]);

  // 4. Create Products
  const p1 = await prisma.product.create({
    data: {
      title: 'Dedicated Cloud Engine Pro',
      slug: 'dedicated-cloud-engine-pro',
      description: '8 vCPU, 32GB RAM, 200GB NVMe High-Availability Node',
      price: 89.99,
      stock: 50,
      status: 'ACTIVE',
      sku: 'CMP-8V-32G',
      categoryId: catCompute.id,
      creatorId: admin.id,
    },
  });

  const p2 = await prisma.product.create({
    data: {
      title: 'PostgreSQL Distributed Cluster',
      slug: 'postgresql-distributed-cluster',
      description: 'High-concurrency relational PostgreSQL 16 cluster with automated multi-zone failover',
      price: 149.50,
      stock: 20,
      status: 'ACTIVE',
      sku: 'DB-PG-CLUSTER',
      categoryId: catDatabase.id,
      creatorId: admin.id,
    },
  });

  const p3 = await prisma.product.create({
    data: {
      title: 'Web Application Firewall Gateway',
      slug: 'web-application-firewall-gateway',
      description: 'Edge-layer WAF protecting against OWASP Top 10 vulnerabilities with zero latency overhead',
      price: 49.00,
      stock: 100,
      status: 'ACTIVE',
      sku: 'SEC-WAF-EDGE',
      categoryId: catSecurity.id,
      creatorId: regularUser.id,
    },
  });

  console.log('📦 Created Products:', [p1.title, p2.title, p3.title]);

  // 5. Create Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        action: 'SEED_INITIALIZE',
        entity: 'System',
        entityId: 'SYSTEM',
        userId: admin.id,
        details: 'Initial database seed executed successfully.',
      },
    ],
  });

  console.log('✅ Database seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
