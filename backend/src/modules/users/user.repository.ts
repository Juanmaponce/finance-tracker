import { prisma } from '../../lib/prisma';
import type { UpdateSettingsDTO } from './user.types';

class UserRepository {
  async updateSettings(userId: string, data: UpdateSettingsDTO) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        displayName: true,
        primaryCurrency: true,
        darkMode: true,
        locale: true,
        createdAt: true,
      },
    });
  }

  async exportUserData(userId: string) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        primaryCurrency: true,
        darkMode: true,
        locale: true,
        createdAt: true,
      },
    });

    const [transactions, categories, savingsGoals, recurringTransactions] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, deletedAt: null },
        include: { category: { select: { name: true } } },
        orderBy: { date: 'desc' },
      }),
      prisma.category.findMany({
        where: { userId },
        orderBy: { name: 'asc' },
      }),
      prisma.savingsGoal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.recurringTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      user,
      transactions,
      categories,
      savingsGoals,
      recurringTransactions,
      exportedAt: new Date().toISOString(),
    };
  }
}

export const userRepository = new UserRepository();
