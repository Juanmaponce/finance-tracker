import { redis } from '../../lib/redis';
import { prisma } from '../../lib/prisma';
import { NotFoundError, ForbiddenError } from '../../lib/errors';
import { transactionRepository } from './transaction.repository';
import { categoryRepository } from '../categories/category.repository';
import { currencyService } from '../currency/currency.service';
import type {
  CreateTransactionDTO,
  UpdateTransactionDTO,
  TransactionFilters,
  TransactionResponse,
  DashboardStats,
  CategoryStats,
} from './transaction.types';

const DASHBOARD_CACHE_TTL = 300; // 5 minutes

class TransactionService {
  async create(userId: string, data: CreateTransactionDTO) {
    let categoryId = data.categoryId;

    if (!categoryId && data.description) {
      categoryId = await this.autoCategorize(
        userId,
        data.description,
        data.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
      );
    }

    if (!categoryId) {
      categoryId = await this.getDefaultCategoryId(
        userId,
        data.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
      );
    }

    const transaction = await transactionRepository.create({
      userId,
      amount: data.amount,
      currency: data.currency,
      categoryId,
      type: data.type,
      description: data.description,
      date: new Date(data.date),
    });

    await this.invalidateCache(userId);
    return this.formatTransaction(transaction);
  }

  async getById(userId: string, id: string) {
    const transaction = await transactionRepository.findById(id);
    if (!transaction) throw new NotFoundError('Transaction not found');
    if (transaction.userId !== userId) throw new ForbiddenError('Access denied');

    return this.formatTransaction(transaction);
  }

  async list(userId: string, filters: Omit<TransactionFilters, 'userId'>) {
    const fullFilters: TransactionFilters = { ...filters, userId };
    const [transactions, total] = await Promise.all([
      transactionRepository.findMany(fullFilters),
      transactionRepository.count(fullFilters),
    ]);

    return {
      transactions: transactions.map((t) => this.formatTransaction(t)),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async update(userId: string, id: string, data: UpdateTransactionDTO) {
    const existing = await transactionRepository.findById(id);
    if (!existing) throw new NotFoundError('Transaction not found');
    if (existing.userId !== userId) throw new ForbiddenError('Access denied');

    const transaction = await transactionRepository.update(id, {
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.currency && { currency: data.currency }),
      ...(data.categoryId && { categoryId: data.categoryId }),
      ...(data.type && { type: data.type }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.date && { date: new Date(data.date) }),
    });

    await this.invalidateCache(userId);
    return this.formatTransaction(transaction);
  }

  async delete(userId: string, id: string) {
    const existing = await transactionRepository.findById(id);
    if (!existing) throw new NotFoundError('Transaction not found');
    if (existing.userId !== userId) throw new ForbiddenError('Access denied');

    await transactionRepository.softDelete(id);
    await this.invalidateCache(userId);
  }

  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const cacheKey = `dashboard:${userId}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {
      // Redis unavailable, continue without cache
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { primaryCurrency: true },
    });
    const primaryCurrency = user?.primaryCurrency || 'USD';

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const transactions = await transactionRepository.getStats(userId, startOfMonth, endOfMonth);

    // Collect unique currencies to fetch rates only once per currency
    const uniqueCurrencies = new Set(transactions.map((t) => t.currency));
    const ratesByCurrency: Record<string, Record<string, number>> = {};
    for (const curr of uniqueCurrencies) {
      if (curr !== primaryCurrency) {
        ratesByCurrency[curr] = await currencyService.getRates(curr);
      }
    }

    let totalExpenses = 0;
    let totalIncome = 0;
    const categoryTotals = new Map<string, CategoryStats>();

    for (const t of transactions) {
      const rawAmount = Number(t.amount);
      const amount = this.convertToTarget(rawAmount, t.currency, primaryCurrency, ratesByCurrency);

      if (t.type === 'EXPENSE') {
        totalExpenses += amount;
        const existing = categoryTotals.get(t.categoryId);
        if (existing) {
          existing.total += amount;
        } else {
          categoryTotals.set(t.categoryId, {
            categoryId: t.categoryId,
            categoryName: t.category.name,
            categoryIcon: t.category.icon,
            categoryColor: t.category.color,
            total: amount,
          });
        }
      } else {
        totalIncome += amount;
      }
    }

    const expensesByCategory = Array.from(categoryTotals.values()).sort(
      (a, b) => b.total - a.total,
    );

    // Get recent 10 transactions (already sorted by date desc in repo)
    const recentFilters: TransactionFilters = { userId, page: 1, limit: 10 };
    const recent = await transactionRepository.findMany(recentFilters);

    const stats: DashboardStats = {
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      balance: Math.round((totalIncome - totalExpenses) * 100) / 100,
      expensesByCategory,
      recentTransactions: recent.map((t) => this.formatTransaction(t)),
    };

    try {
      await redis.set(cacheKey, JSON.stringify(stats), 'EX', DASHBOARD_CACHE_TTL);
    } catch {
      // Redis unavailable, skip caching
    }

    return stats;
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

  private async autoCategorize(
    userId: string,
    description: string,
    type: 'EXPENSE' | 'INCOME',
  ): Promise<string | undefined> {
    const categories = await categoryRepository.findByUserId(userId, type);
    const normalized = description
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    const words = normalized.split(/\s+/);

    let bestMatch = { categoryId: undefined as string | undefined, score: 0 };

    for (const category of categories) {
      if (category.keywords.length === 0) continue;
      const matches = category.keywords.filter((keyword) =>
        words.some((word) => word.includes(keyword) || keyword.includes(word)),
      );

      if (matches.length > bestMatch.score) {
        bestMatch = { categoryId: category.id, score: matches.length };
      }
    }

    return bestMatch.categoryId;
  }

  private async getDefaultCategoryId(userId: string, type: 'EXPENSE' | 'INCOME'): Promise<string> {
    const categories = await categoryRepository.findByUserId(userId, type);
    const fallback = categories.find((c) => c.name === 'Otros' || c.name === 'Otros ingresos');
    return fallback?.id || categories[0]?.id || '';
  }

  private async invalidateCache(userId: string) {
    try {
      await redis.del(`dashboard:${userId}`);
    } catch {
      // Redis unavailable
    }
  }

  private formatTransaction(t: {
    id: string;
    amount: unknown;
    currency: string;
    type: 'EXPENSE' | 'INCOME';
    description: string | null;
    date: Date;
    receiptUrl?: string | null;
    isRecurring: boolean;
    createdAt: Date;
    category: { id: string; name: string; icon: string; color: string };
  }): TransactionResponse {
    return {
      id: t.id,
      amount: Number(t.amount),
      currency: t.currency,
      type: t.type,
      description: t.description,
      date: t.date,
      receiptUrl: t.receiptUrl ?? null,
      isRecurring: t.isRecurring,
      createdAt: t.createdAt,
      category: t.category,
    };
  }
}

export const transactionService = new TransactionService();
