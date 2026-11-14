import { prisma } from '../../config/database.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../errors/AppError.js';
import { AuthUser } from '../../types/auth.js';
import { UpdateUserInput, UserQueryInput } from './user.schema.js';

export class UserService {
  async findAll(query: UserQueryInput) {
    const { page, limit, search, role, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) {
      where.role = role;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { products: true },
          },
        },
      }),
      prisma.user.count({ where }),
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
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        products: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundError(`User with ID '${id}' not found`);
    }

    return user;
  }

  async update(id: string, data: UpdateUserInput, currentUser: AuthUser) {
    await this.findById(id);

    // Permission enforcement: only self or ADMIN can edit profile
    if (currentUser.role !== 'ADMIN' && currentUser.id !== id) {
      throw new ForbiddenError('You can only update your own user account.');
    }

    // Only ADMIN can change roles
    if (data.role && currentUser.role !== 'ADMIN') {
      throw new ForbiddenError('Only administrators can promote or change user roles.');
    }

    if (data.email) {
      const existing = await prisma.user.findFirst({
        where: {
          id: { not: id },
          email: data.email,
        },
      });

      if (existing) {
        throw new ConflictError('A user with this email address already exists.');
      }
    }

    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });
  }
}

export const userService = new UserService();
