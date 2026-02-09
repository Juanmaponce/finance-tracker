import { prisma } from '../../lib/prisma';
import type { Prisma, TransactionType } from '@prisma/client';
import type { TransactionFilters } from './transaction.types';

const categorySelect = {
  select: { id: true, name: true, icon: true, color: true },
} as const;

class TransactionRepository {
  private buildWhere(filters: TransactionFilters): Prisma.TransactionWhereInput {
    return {
      userId: filters.userId,
      deletedAt: null,
      ...(filters.type && { type: filters.type }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...((filters.startDate || filters.endDate) && {
        date: {
          ...(filters.startDate && { gte: new Date(filters.startDate) }),
          ...(filters.endDate && { lte: new Date(filters.endDate) }),
        },
      }),
    };
  }

  async findMany(filters: TransactionFilters) {
    const where = this.buildWhere(filters);
    const skip = (filters.page - 1) * filters.limit;

    return prisma.transaction.findMany({
      where,
      include: { category: categorySelect },
      orderBy: { date: 'desc' },
      skip,
      take: filters.limit,
    });
  }

  async count(filters: TransactionFilters) {
    return prisma.transaction.count({ where: this.buildWhere(filters) });
  }

  async findById(id: string) {
    return prisma.transaction.findFirst({
      where: { id, deletedAt: null },
      include: { category: categorySelect },
    });
  }

  async create(data: {
    userId: string;
    amount: number;
    currency: string;
    categoryId: string;
    type: TransactionType;
    description?: string;
    date: Date;
  }) {
    return prisma.transaction.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        currency: data.currency,
        categoryId: data.categoryId,
        type: data.type,
        description: data.description,
        date: data.date,
      },
      include: { category: categorySelect },
    });
  }

  async update(id: string, data: Prisma.TransactionUpdateInput) {
    return prisma.transaction.update({
      where: { id },
      data,
      include: { category: categorySelect },
    });
  }

  async softDelete(id: string) {
    return prisma.transaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getStats(userId: string, startDate: Date, endDate: Date) {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
      },
      include: { category: categorySelect },
    });

    return transactions;
  }
}

export const transactionRepository = new TransactionRepository();
