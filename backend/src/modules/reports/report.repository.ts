import { prisma } from '../../lib/prisma';

const categorySelect = {
  select: { id: true, name: true, icon: true, color: true },
} as const;

class ReportRepository {
  async getTransactions(
    userId: string,
    startDate: Date,
    endDate: Date,
    type?: string,
    categoryId?: string,
  ) {
    return prisma.transaction.findMany({
      where: {
        userId,
        deletedAt: null,
        date: { gte: startDate, lte: endDate },
        ...(type && { type: type as 'EXPENSE' | 'INCOME' }),
        ...(categoryId && { categoryId }),
      },
      include: { category: categorySelect },
      orderBy: { date: 'asc' },
    });
  }
}

export const reportRepository = new ReportRepository();
