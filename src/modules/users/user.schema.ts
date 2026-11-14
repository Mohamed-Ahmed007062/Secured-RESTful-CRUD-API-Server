import { z } from 'zod';

export const userIdParamSchema = z.object({
  id: z.string().uuid('User ID must be a valid UUID'),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(64).trim().optional(),
  email: z.string().email().trim().toLowerCase().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
});

export const userQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  sortBy: z.enum(['name', 'email', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
