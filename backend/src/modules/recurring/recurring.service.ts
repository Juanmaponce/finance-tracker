import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { NotFoundError, ForbiddenError } from '../../lib/errors';
import { recurringRepository } from './recurring.repository';
import { logger } from '../../lib/logger';
import type { Frequency } from '@prisma/client';

interface CreateRecurringDTO {
  amount: number;
  currency: string;
  categoryId: string;
  description?: string;
  frequency: Frequency;
  nextExecution: string;
}

interface UpdateRecurringDTO {
  amount?: number;
  currency?: string;
  categoryId?: string;
  description?: string;
  frequency?: Frequency;
  nextExecution?: string;
}

class RecurringService {
  async list(userId: string) {
    return recurringRepository.findByUserId(userId);
  }

  async create(userId: string, data: CreateRecurringDTO) {
    const recurring = await recurringRepository.create({
      userId,
      amount: data.amount,
      currency: data.currency,
      categoryId: data.categoryId,
      description: data.description,
      frequency: data.frequency,
      nextExecution: new Date(data.nextExecution),
    });
    return recurring;
  }

  async update(userId: string, id: string, data: UpdateRecurringDTO) {
    const existing = await recurringRepository.findById(id);
    if (!existing) throw new NotFoundError('Gasto recurrente no encontrado');
    if (existing.userId !== userId) throw new ForbiddenError('Acceso denegado');

    return recurringRepository.update(id, {
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.currency && { currency: data.currency }),
      ...(data.categoryId && { categoryId: data.categoryId }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.frequency && { frequency: data.frequency }),
      ...(data.nextExecution && { nextExecution: new Date(data.nextExecution) }),
    });
  }

  async toggle(userId: string, id: string) {
    const existing = await recurringRepository.findById(id);
    if (!existing) throw new NotFoundError('Gasto recurrente no encontrado');
    if (existing.userId !== userId) throw new ForbiddenError('Acceso denegado');

    return recurringRepository.toggleActive(id, !existing.isActive);
  }

  async delete(userId: string, id: string) {
    const existing = await recurringRepository.findById(id);
    if (!existing) throw new NotFoundError('Gasto recurrente no encontrado');
    if (existing.userId !== userId) throw new ForbiddenError('Acceso denegado');

    await recurringRepository.delete(id);
  }

  async processRecurring() {
    const due = await recurringRepository.findDueForExecution();
    let processed = 0;
    let errors = 0;

    for (const template of due) {
      try {
        // Determine type from category
        const category = await prisma.category.findUnique({
          where: { id: template.categoryId },
          select: { type: true },
        });
        const txType = category?.type === 'INCOME' ? 'INCOME' : 'EXPENSE';

        await prisma.$transaction(async (tx) => {
          await tx.transaction.create({
            data: {
              userId: template.userId,
              amount: template.amount,
              currency: template.currency,
              categoryId: template.categoryId,
              type: txType,
              description: template.description,
              date: new Date(),
              isRecurring: true,
              recurringId: template.id,
            },
          });

          await tx.recurringTransaction.update({
            where: { id: template.id },
            data: {
              nextExecution: this.calculateNextDate(template.frequency, template.nextExecution),
            },
          });
        });

        await this.invalidateCache(template.userId);
        processed++;
      } catch {
        errors++;
        logger.error(`Failed to process recurring transaction ${template.id}`);
      }
    }

    logger.info(`Processed ${processed}/${due.length} recurring transactions. Errors: ${errors}`);
    return { processed, errors, total: due.length };
  }

  private calculateNextDate(frequency: Frequency, fromDate: Date): Date {
    const next = new Date(fromDate);
    switch (frequency) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'YEARLY':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }

  private async invalidateCache(userId: string) {
    try {
      await redis.del(`dashboard:${userId}`);
    } catch {
      // Redis unavailable
    }
  }
}

export const recurringService = new RecurringService();
