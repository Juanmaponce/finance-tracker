import { prisma } from '../../lib/prisma';
import type { Frequency } from '@prisma/client';

interface CreateRecurringData {
  userId: string;
  amount: number;
  currency: string;
  categoryId: string;
  description?: string;
  frequency: Frequency;
  nextExecution: Date;
}

interface UpdateRecurringData {
  amount?: number;
  currency?: string;
  categoryId?: string;
  description?: string;
  frequency?: Frequency;
  nextExecution?: Date;
}

class RecurringRepository {
  async findByUserId(userId: string) {
    return prisma.recurringTransaction.findMany({
      where: { userId },
      include: { user: { select: { primaryCurrency: true } } },
      orderBy: { nextExecution: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.recurringTransaction.findUnique({
      where: { id },
    });
  }

  async create(data: CreateRecurringData) {
    return prisma.recurringTransaction.create({ data });
  }

  async update(id: string, data: UpdateRecurringData) {
    return prisma.recurringTransaction.update({
      where: { id },
      data,
    });
  }

  async toggleActive(id: string, isActive: boolean) {
    return prisma.recurringTransaction.update({
      where: { id },
      data: { isActive },
    });
  }

  async delete(id: string) {
    return prisma.recurringTransaction.delete({ where: { id } });
  }

  async findDueForExecution() {
    return prisma.recurringTransaction.findMany({
      where: {
        isActive: true,
        nextExecution: { lte: new Date() },
      },
    });
  }
}

export const recurringRepository = new RecurringRepository();
