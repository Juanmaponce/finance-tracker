import { prisma } from '../../lib/prisma';
import type { CategoryType } from '@prisma/client';

interface CreateCategoryData {
  userId: string;
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  keywords?: string[];
}

interface UpdateCategoryData {
  name?: string;
  icon?: string;
  color?: string;
  keywords?: string[];
}

class CategoryRepository {
  async findByUserId(userId: string, type?: CategoryType) {
    return prisma.category.findMany({
      where: {
        userId,
        ...(type && { type }),
      },
      select: {
        id: true,
        name: true,
        icon: true,
        color: true,
        type: true,
        isDefault: true,
        keywords: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.category.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        icon: true,
        color: true,
        type: true,
        userId: true,
        isDefault: true,
        keywords: true,
      },
    });
  }

  async findByUserIdAndName(userId: string, name: string) {
    return prisma.category.findFirst({
      where: { userId, name },
      select: { id: true },
    });
  }

  async create(data: CreateCategoryData) {
    return prisma.category.create({
      data: {
        userId: data.userId,
        name: data.name,
        icon: data.icon,
        color: data.color,
        type: data.type,
        keywords: data.keywords || [],
        isDefault: false,
      },
      select: {
        id: true,
        name: true,
        icon: true,
        color: true,
        type: true,
        isDefault: true,
        keywords: true,
      },
    });
  }

  async update(id: string, data: UpdateCategoryData) {
    return prisma.category.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        icon: true,
        color: true,
        type: true,
        isDefault: true,
        keywords: true,
      },
    });
  }

  async delete(id: string) {
    return prisma.category.delete({ where: { id } });
  }

  async hasTransactions(id: string): Promise<boolean> {
    const count = await prisma.transaction.count({
      where: { categoryId: id, deletedAt: null },
    });
    return count > 0;
  }
}

export const categoryRepository = new CategoryRepository();
