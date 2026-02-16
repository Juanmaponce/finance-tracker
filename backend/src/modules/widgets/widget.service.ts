import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import type { MonthlySummary } from './widget.types';

const WIDGET_CACHE_TTL = 900; // 15 minutes

function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function getUserCurrency(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { primaryCurrency: true },
  });
  return user?.primaryCurrency || 'USD';
}

class WidgetService {
  async getMonthlySummary(userId: string): Promise<MonthlySummary> {
    const cacheKey = `widget:monthly:${userId}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // Redis unavailable, continue without cache
    }

    const startOfMonth = getStartOfMonth();
    const currency = await getUserCurrency(userId);

    const [expenses, income, topCategoryResult] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE',
          date: { gte: startOfMonth },
          deletedAt: null,
        },
        _sum: { amount: true },
      }),

      prisma.transaction.aggregate({
        where: {
          userId,
          type: 'INCOME',
          date: { gte: startOfMonth },
          deletedAt: null,
        },
        _sum: { amount: true },
      }),

      prisma.transaction
        .groupBy({
          by: ['categoryId'],
          where: {
            userId,
            type: 'EXPENSE',
            date: { gte: startOfMonth },
            deletedAt: null,
          },
          _sum: { amount: true },
          orderBy: { _sum: { amount: 'desc' } },
          take: 1,
        })
        .then(async (result) => {
          if (!result[0]) return null;
          const category = await prisma.category.findUnique({
            where: { id: result[0].categoryId },
            select: { name: true },
          });
          return {
            name: category?.name || 'Unknown',
            amount: Number(result[0]._sum.amount) || 0,
          };
        }),
    ]);

    const totalExpenses = Number(expenses._sum.amount) || 0;
    const totalIncome = Number(income._sum.amount) || 0;

    const summary: MonthlySummary = {
      totalExpenses,
      totalIncome,
      balance: totalIncome - totalExpenses,
      topCategory: topCategoryResult || { name: 'N/A', amount: 0 },
      month: new Date().toLocaleString('es', { month: 'long' }),
      currency,
    };

    try {
      await redis.set(cacheKey, JSON.stringify(summary), 'EX', WIDGET_CACHE_TTL);
    } catch {
      // Redis unavailable
    }

    return summary;
  }
}

export const widgetService = new WidgetService();
