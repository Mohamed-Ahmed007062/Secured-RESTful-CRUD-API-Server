import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { UnauthorizedError } from '../errors/AppError.js';
import { AuthUser } from '../types/auth.js';

interface JwtPayload {
  userId: string;
  role: string;
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header. Expected "Bearer <token>"'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (!user) {
      return next(new UnauthorizedError('The user associated with this token no longer exists.'));
    }

    req.user = user as AuthUser;
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid, expired, or tampered token.'));
  }
}
