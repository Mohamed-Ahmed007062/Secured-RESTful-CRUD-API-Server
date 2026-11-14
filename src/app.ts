import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { env } from './config/env.js';
import { securityHeaders } from './middleware/securityHeaders.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './errors/AppError.js';

import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { categoryRouter } from './modules/categories/category.routes.js';
import { productRouter } from './modules/products/product.routes.js';
import { userRouter } from './modules/users/user.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): Application {
  const app = express();

  // 1. Security Headers & CORS Middleware
  app.use(securityHeaders);

  app.use(
    cors({
      origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(','),
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // 2. Logging
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  }

  // 3. Body Parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // 4. Rate Limiting for all API routes
  app.use('/api', apiRateLimiter);

  // 5. Interactive API Documentation via Swagger UI
  try {
    const localDocPath = path.resolve(__dirname, './docs/swagger.yaml');
    const srcDocPath = path.resolve(__dirname, '../src/docs/swagger.yaml');
    const swaggerDocPath = fs.existsSync(localDocPath) ? localDocPath : srcDocPath;

    if (fs.existsSync(swaggerDocPath)) {
      const swaggerDocument = YAML.load(swaggerDocPath);
      app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    }
  } catch (error) {
    console.warn('⚠️ Swagger documentation file could not be loaded:', error);
  }

  // 6. Base & Health Endpoints
  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      name: 'Secured RESTful CRUD API Server',
      version: '1.0.0',
      status: 'online',
      documentation: '/api-docs',
      health: '/health',
    });
  });

  app.use('/health', healthRouter);
  app.use('/api/v1/health', healthRouter);

  // 7. Versioned API Routes (v1)
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/categories', categoryRouter);
  app.use('/api/v1/products', productRouter);
  app.use('/api/v1/users', userRouter);

  // 8. 404 Catch-All Route
  app.all('*', (req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Cannot find endpoint ${req.method} ${req.originalUrl} on this server`));
  });

  // 9. Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
}
