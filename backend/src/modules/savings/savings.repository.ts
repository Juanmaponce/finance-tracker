import { prisma } from '../../lib/prisma';

interface CreateSavingsData {
  userId: string;
  name: string;
  targetAmount: number;
  currency: string;
  deadline?: Date;
}

interface UpdateSavingsData {
  name?: string;
  targetAmount?: number;
  deadline?: Date | null;
}

class SavingsRepository {
  async findByUserId(userId: string) {
    return prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    return prisma.savingsGoal.findUnique({
      where: { id },
    });
  }

  async create(data: CreateSavingsData) {
    return prisma.savingsGoal.create({
      data: {
        userId: data.userId,
        name: data.name,
        targetAmount: data.targetAmount,
        currentAmount: 0,
        currency: data.currency,
        deadline: data.deadline,
      },
    });
  }

  async update(id: string, data: UpdateSavingsData) {
    return prisma.savingsGoal.update({
      where: { id },
      data,
    });
  }

  async deposit(id: string, amount: number) {
    return prisma.savingsGoal.update({
      where: { id },
      data: {
        currentAmount: { increment: amount },
      },
    });
  }

  async delete(id: string) {
    return prisma.savingsGoal.delete({ where: { id } });
  }
}

export const savingsRepository = new SavingsRepository();
