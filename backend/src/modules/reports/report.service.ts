import { redis } from '../../lib/redis';
import { prisma } from '../../lib/prisma';
import { currencyService } from '../currency/currency.service';
import { reportRepository } from './report.repository';
import type {
  ReportFilters,
  ReportSummary,
  PeriodComparison,
  CategoryBreakdown,
  DailyTrend,
} from './report.types';

const REPORT_CACHE_TTL = 300; // 5 minutes

class ReportService {
  async getSummary(filters: ReportFilters): Promise<ReportSummary> {
    const cacheKey = `report:${filters.userId}:${filters.startDate}:${filters.endDate}:${filters.type || 'all'}:${filters.categoryId || 'all'}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // Redis unavailable
    }

    const primaryCurrency = await this.getUserCurrency(filters.userId);
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999);

    const transactions = await reportRepository.getTransactions(
      filters.userId,
      startDate,
      endDate,
      filters.type,
      filters.categoryId,
    );

    // Pre-fetch exchange rates
    const uniqueCurrencies = new Set(transactions.map((t) => t.currency));
    const ratesByCurrency: Record<string, Record<string, number>> = {};
    for (const curr of uniqueCurrencies) {
      if (curr !== primaryCurrency) {
        ratesByCurrency[curr] = await currencyService.getRates(curr);
      }
    }

    let totalExpenses = 0;
    let totalIncome = 0;
    let expenseCount = 0;
    let incomeCount = 0;
    const categoryMap = new Map<string, CategoryBreakdown>();
    const dailyMap = new Map<string, { expenses: number; income: number }>();

    for (const t of transactions) {
      const rawAmount = Number(t.amount);
      const amount = this.convertToTarget(rawAmount, t.currency, primaryCurrency, ratesByCurrency);
      const dateKey = t.date.toISOString().slice(0, 10);

      // Daily trend
      const daily = dailyMap.get(dateKey) || { expenses: 0, income: 0 };

      if (t.type === 'EXPENSE') {
        totalExpenses += amount;
        expenseCount++;
        daily.expenses += amount;

        // Category breakdown
        const existing = categoryMap.get(t.categoryId);
        if (existing) {
          existing.total += amount;
          existing.count++;
        } else {
          categoryMap.set(t.categoryId, {
            categoryId: t.categoryId,
            categoryName: t.category.name,
            categoryIcon: t.category.icon,
            categoryColor: t.category.color,
            total: amount,
            count: 1,
            percentage: 0,
          });
        }
      } else {
        totalIncome += amount;
        incomeCount++;
        daily.income += amount;
      }

      dailyMap.set(dateKey, daily);
    }

    // Calculate category percentages
    const byCategory = Array.from(categoryMap.values())
      .map((c) => ({
        ...c,
        total: Math.round(c.total * 100) / 100,
        percentage: totalExpenses > 0 ? Math.round((c.total / totalExpenses) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Fill daily trend with all dates in range
    const dailyTrend = this.fillDailyTrend(dailyMap, startDate, endDate);

    const summary: ReportSummary = {
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      balance: Math.round((totalIncome - totalExpenses) * 100) / 100,
      transactionCount: transactions.length,
      avgExpense: expenseCount > 0 ? Math.round((totalExpenses / expenseCount) * 100) / 100 : 0,
      avgIncome: incomeCount > 0 ? Math.round((totalIncome / incomeCount) * 100) / 100 : 0,
      byCategory,
      dailyTrend,
      currency: primaryCurrency,
      startDate: filters.startDate,
      endDate: filters.endDate,
    };

    try {
      await redis.set(cacheKey, JSON.stringify(summary), 'EX', REPORT_CACHE_TTL);
    } catch {
      // Redis unavailable
    }

    return summary;
  }

  async getComparison(
    userId: string,
    period1Start: string,
    period1End: string,
    period2Start: string,
    period2End: string,
  ): Promise<PeriodComparison> {
    const [p1, p2] = await Promise.all([
      this.getSummary({ userId, startDate: period1Start, endDate: period1End }),
      this.getSummary({ userId, startDate: period2Start, endDate: period2End }),
    ]);

    return {
      period1: p1,
      period2: p2,
      changes: {
        expenses: this.percentChange(p1.totalExpenses, p2.totalExpenses),
        income: this.percentChange(p1.totalIncome, p2.totalIncome),
        balance: this.percentChange(p1.balance, p2.balance),
        transactionCount: this.percentChange(p1.transactionCount, p2.transactionCount),
      },
    };
  }

  private percentChange(previous: number, current: number): number {
    if (previous === 0) return current === 0 ? 0 : 100;
    return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
  }

  private fillDailyTrend(
    dailyMap: Map<string, { expenses: number; income: number }>,
    startDate: Date,
    endDate: Date,
  ): DailyTrend[] {
    const trend: DailyTrend[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateKey = current.toISOString().slice(0, 10);
      const data = dailyMap.get(dateKey);
      trend.push({
        date: dateKey,
        expenses: Math.round((data?.expenses || 0) * 100) / 100,
        income: Math.round((data?.income || 0) * 100) / 100,
      });
      current.setDate(current.getDate() + 1);
    }

    return trend;
  }

  private convertToTarget(
    amount: number,
    fromCurrency: string,
    targetCurrency: string,
    ratesByCurrency: Record<string, Record<string, number>>,
  ): number {
    if (fromCurrency === targetCurrency) return amount;
    const rates = ratesByCurrency[fromCurrency];
    if (!rates) return amount;
    const rate = rates[targetCurrency] || 1;
    return Math.round(amount * rate * 100) / 100;
  }

  private async getUserCurrency(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { primaryCurrency: true },
    });
    return user?.primaryCurrency || 'USD';
  }
}

export const reportService = new ReportService();
