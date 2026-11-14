import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';

export class HealthController {
  async getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startTime = Date.now();
      // Verify active SQL database connection
      await prisma.$queryRaw`SELECT 1`;
      const dbLatencyMs = Date.now() - startTime;

      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        environment: env.NODE_ENV,
        database: {
          status: 'connected',
          latencyMs: dbLatencyMs,
        },
        memoryUsage: process.memoryUsage(),
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: {
          status: 'disconnected',
          error: (error as Error).message,
        },
      });
    }
  }
}

export const healthController = new HealthController();
