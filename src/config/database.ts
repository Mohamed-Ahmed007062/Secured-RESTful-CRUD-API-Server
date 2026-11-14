import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

// If running in Vercel serverless environment and using SQLite, prepare writable /tmp/dev.db
let effectiveDbUrl = env.DATABASE_URL;

if (process.env.VERCEL) {
  const isPostgres =
    process.env.DATABASE_URL?.startsWith('postgresql:') ||
    process.env.DATABASE_URL?.startsWith('postgres:');

  if (!isPostgres) {
    const tmpDbPath = '/tmp/dev.db';
    if (!fs.existsSync(tmpDbPath)) {
      const templatePath = path.resolve(process.cwd(), 'prisma', 'template.db');
      if (fs.existsSync(templatePath)) {
        try {
          fs.copyFileSync(templatePath, tmpDbPath);
          console.log('✅ Initialized /tmp/dev.db from template database on Vercel.');
        } catch (err) {
          console.error('⚠️ Could not copy template db to /tmp:', err);
        }
      }
    }
    effectiveDbUrl = 'file:/tmp/dev.db';
    process.env.DATABASE_URL = effectiveDbUrl;
  }
}

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: effectiveDbUrl,
    },
  },
  log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    // Test SQL connection with a simple ping query
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Connected to SQL Database successfully.');
  } catch (error) {
    console.error('❌ Failed to connect to the SQL Database:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
  console.log('🔌 Disconnected from SQL Database.');
}
