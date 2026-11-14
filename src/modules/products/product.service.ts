import { prisma } from '../../config/database.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../errors/AppError.js';
import { CreateProductInput, UpdateProductInput, ProductQueryInput } from './product.schema.js';
import { AuthUser } from '../../types/auth.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class ProductService {
  async create(data: CreateProductInput, user: AuthUser) {
    // 1. Verify foreign key relation: Category must exist
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });

    if (!category) {
      throw new BadRequestError(`Referenced category with ID '${data.categoryId}' does not exist.`);
    }

    const slug = data.slug || slugify(data.title);

    // 2. Check unique constraints (slug and SKU)
    const existingConflict = await prisma.product.findFirst({
      where: {
        OR: [{ slug }, { sku: data.sku }],
      },
    });

    if (existingConflict) {
      if (existingConflict.sku === data.sku) {
        throw new ConflictError(`Product with SKU '${data.sku}' already exists.`);
      }
      throw new ConflictError(`Product with slug '${slug}' already exists.`);
    }

    // 3. Atomic Database Transaction: Create Product + Audit Log
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          title: data.title,
          slug,
          description: data.description,
          price: data.price,
          stock: data.stock,
          status: data.status,
          sku: data.sku,
          categoryId: data.categoryId,
          creatorId: user.id,
        },
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          creator: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CREATE_PRODUCT',
          entity: 'Product',
          entityId: product.id,
          userId: user.id,
          details: JSON.stringify({ title: product.title, sku: product.sku, price: product.price }),
        },
      });

      return product;
    });
  }

  async findAll(query: ProductQueryInput) {
    const { page, limit, search, status, categoryId, minPrice, maxPrice, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string) {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, slug: true, description: true },
        },
        creator: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundError(`Product with ID '${id}' not found`);
    }

    return product;
  }

  async update(id: string, data: UpdateProductInput, user: AuthUser) {
    const existing = await this.findById(id);

    // Permission enforcement: Creator or ADMIN
    if (user.role !== 'ADMIN' && existing.creatorId !== user.id) {
      throw new ForbiddenError('You do not have permission to modify this product.');
    }

    // Verify new category if categoryId is being changed
    if (data.categoryId && data.categoryId !== existing.categoryId) {
      const categoryExists = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!categoryExists) {
        throw new BadRequestError(`Referenced category with ID '${data.categoryId}' does not exist.`);
      }
    }

    const slug = data.slug || (data.title ? slugify(data.title) : undefined);

    // Check conflict on SKU or slug
    if (data.sku || slug) {
      const conflict = await prisma.product.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(data.sku ? [{ sku: data.sku }] : []),
                ...(slug ? [{ slug }] : []),
              ],
            },
          ],
        },
      });

      if (conflict) {
        if (conflict.sku === data.sku) {
          throw new ConflictError(`Product with SKU '${data.sku}' already exists.`);
        }
        throw new ConflictError(`Product with slug '${slug}' already exists.`);
      }
    }

    // Atomic Database Transaction: Update Product + Audit Log
    return prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id },
        data: {
          ...data,
          ...(slug ? { slug } : {}),
        },
        include: {
          category: {
            select: { id: true, name: true, slug: true },
          },
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE_PRODUCT',
          entity: 'Product',
          entityId: id,
          userId: user.id,
          details: JSON.stringify(data),
        },
      });

      return updated;
    });
  }

  async delete(id: string, user: AuthUser) {
    const existing = await this.findById(id);

    // Permission enforcement: Creator or ADMIN
    if (user.role !== 'ADMIN' && existing.creatorId !== user.id) {
      throw new ForbiddenError('You do not have permission to delete this product.');
    }

    return prisma.$transaction(async (tx) => {
      await tx.auditLog.create({
        data: {
          action: 'DELETE_PRODUCT',
          entity: 'Product',
          entityId: id,
          userId: user.id,
          details: JSON.stringify({ title: existing.title, sku: existing.sku }),
        },
      });

      return tx.product.delete({
        where: { id },
      });
    });
  }
}

export const productService = new ProductService();
