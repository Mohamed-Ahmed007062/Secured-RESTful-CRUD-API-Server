import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 1. Handled Operational Application Errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'fail',
      statusCode: err.statusCode,
      message: err.message,
      ...(err.details ? { errors: err.details } : {}),
      ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
    });
    return;
  }

  // 2. Prisma Database Specific Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // P2002: Unique constraint violation
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
      res.status(409).json({
        status: 'fail',
        statusCode: 409,
        message: `A resource with this ${target} already exists.`,
        code: err.code,
      });
      return;
    }

    // P2025: Record not found for operation
    if (err.code === 'P2025') {
      res.status(404).json({
        status: 'fail',
        statusCode: 404,
        message: (err.meta?.cause as string) || 'Target resource not found in database.',
        code: err.code,
      });
      return;
    }

    // P2003: Foreign key constraint failure
    if (err.code === 'P2003') {
      res.status(400).json({
        status: 'fail',
        statusCode: 400,
        message: `Foreign key constraint failed on field: ${err.meta?.field_name || 'relation'}. Referenced entity does not exist.`,
        code: err.code,
      });
      return;
    }
  }

  // 3. Body-parser malformed JSON syntax error
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      status: 'fail',
      statusCode: 400,
      message: 'Malformed JSON payload in request body.',
    });
    return;
  }

  // 4. JWT Authentication token error
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      status: 'fail',
      statusCode: 401,
      message: err.message === 'jwt expired' ? 'Authentication token expired' : 'Invalid authentication token',
    });
    return;
  }

  // 5. Unhandled / Unexpected Server Errors (500)
  console.error('💥 Unhandled Exception:', err);
  res.status(500).json({
    status: 'error',
    statusCode: 500,
    message: env.NODE_ENV === 'production' ? 'Internal server error occurred.' : err.message,
    ...(env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}
