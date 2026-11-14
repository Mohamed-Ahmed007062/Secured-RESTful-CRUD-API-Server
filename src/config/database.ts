import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

export const prisma = new PrismaClient({
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
