import { prisma } from '../../config/database.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../errors/AppError.js';
import { CreateCategoryInput, UpdateCategoryInput, CategoryQueryInput } from './category.schema.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class CategoryService {
  async create(data: CreateCategoryInput) {
    const slug = data.slug || slugify(data.name);

    const existing = await prisma.category.findFirst({
      where: {
        OR: [{ name: data.name }, { slug }],
      },
    });

    if (existing) {
      throw new ConflictError('A category with this name or slug already exists.');
    }

    return prisma.category.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
      },
    });
  }

  async findAll(query: CategoryQueryInput) {
    const { page, limit, search, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          _count: {
            select: { products: true },
          },
        },
      }),
      prisma.category.count({ where }),
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
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundError(`Category with ID '${id}' not found`);
    }

    return category;
  }

  async update(id: string, data: UpdateCategoryInput) {
    await this.findById(id);

    const slug = data.slug || (data.name ? slugify(data.name) : undefined);

    if (data.name || slug) {
      const conflict = await prisma.category.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(data.name ? [{ name: data.name }] : []),
                ...(slug ? [{ slug }] : []),
              ],
            },
          ],
        },
      });

      if (conflict) {
        throw new ConflictError('Another category already exists with that name or slug.');
      }
    }

    return prisma.category.update({
      where: { id },
      data: {
        ...data,
        ...(slug ? { slug } : {}),
      },
    });
  }

  async delete(id: string) {
    const category = await this.findById(id);

    const productCount = await prisma.product.count({
      where: { categoryId: id },
    });

    if (productCount > 0) {
      throw new BadRequestError(
        `Cannot delete category '${category.name}' because it contains ${productCount} active product(s). Remove or reassign the products first.`
      );
    }

    return prisma.category.delete({
      where: { id },
    });
  }
}

export const categoryService = new CategoryService();
