import { z } from 'zod';

export const createProductSchema = z.object({
  title: z
    .string({ required_error: 'Product title is required' })
    .min(2, 'Title must be at least 2 characters')
    .max(100, 'Title cannot exceed 100 characters')
    .trim(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(120, 'Slug cannot exceed 120 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
  price: z
    .number({ required_error: 'Price is required' })
    .positive('Price must be greater than zero')
    .max(1000000, 'Price must not exceed 1,000,000'),
  stock: z
    .number()
    .int('Stock must be an integer')
    .nonnegative('Stock cannot be negative')
    .default(0),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
  sku: z
    .string({ required_error: 'SKU is required' })
    .min(3, 'SKU must be at least 3 characters')
    .max(30, 'SKU cannot exceed 30 characters')
    .toUpperCase()
    .trim(),
  categoryId: z.string({ required_error: 'Category ID is required' }).uuid('Category ID must be a valid UUID'),
});

export const updateProductSchema = createProductSchema.partial();

export const productIdParamSchema = z.object({
  id: z.string().uuid('Product ID must be a valid UUID'),
});

export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
  categoryId: z.string().uuid().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  sortBy: z.enum(['title', 'price', 'stock', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
