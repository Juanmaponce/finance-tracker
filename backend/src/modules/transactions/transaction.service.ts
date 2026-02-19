import { redis } from '../../lib/redis';
import { prisma } from '../../lib/prisma';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors';
import { transactionRepository } from './transaction.repository';
import { categoryRepository } from '../categories/category.repository';
import { currencyService } from '../currency/currency.service';
import { savingsService } from '../savings/savings.service';
import { accountService } from '../accounts/account.service';
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

    // Auto-assign default account if not provided
    let accountId = data.accountId;
    if (!accountId) {
      const defaultAccount = await accountService.getDefaultAccount(userId);
      accountId = defaultAccount?.id;
    }

    if (accountId && (data.type === 'EXPENSE' || data.type === 'TRANSFER_TO_SAVINGS')) {
      const balance = await accountService.getAvailableBalance(accountId);
      if (data.amount > balance) {
        throw new ValidationError(
          `Balance insuficiente. Disponible: ${balance.toFixed(2)} ${data.currency}`,
        );
      }
    }

    const transaction = await transactionRepository.create({
      userId,
      accountId,
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

    const effectiveType = data.type || existing.type;
    const effectiveAmount = data.amount ?? Number(existing.amount);
    const effectiveAccountId = data.accountId || existing.accountId;

    if (
      effectiveAccountId &&
      (effectiveType === 'EXPENSE' || effectiveType === 'TRANSFER_TO_SAVINGS')
    ) {
      const balance = await accountService.getAvailableBalance(effectiveAccountId);
      // Add back the existing debit since it's already counted in the balance
      const existingDebit =
        (existing.type === 'EXPENSE' || existing.type === 'TRANSFER_TO_SAVINGS') &&
        existing.accountId === effectiveAccountId
          ? Number(existing.amount)
          : 0;
      const availableForUpdate = balance + existingDebit;

      if (effectiveAmount > availableForUpdate) {
        const currency = data.currency || existing.currency;
        throw new ValidationError(
          `Balance insuficiente. Disponible: ${availableForUpdate.toFixed(2)} ${currency}`,
        );
      }
    }

    const transaction = await transactionRepository.update(id, {
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.currency && { currency: data.currency }),
      ...(data.categoryId && { categoryId: data.categoryId }),
      ...(data.accountId && { accountId: data.accountId }),
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

  async getDashboardStats(userId: string, accountId?: string): Promise<DashboardStats> {
    const cacheKey = `dashboard:${userId}:${accountId || 'all'}`;

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

    const transactions = await transactionRepository.getStats(
      userId,
      startOfMonth,
      endOfMonth,
      accountId,
    );

    // All-time balances per account (needed for allTimeBalance)
    const accountBalances = await accountService.getAllBalances(userId);

    // Collect unique currencies from transactions and accounts
    const uniqueCurrencies = new Set(transactions.map((t) => t.currency));
    for (const ab of accountBalances) {
      uniqueCurrencies.add(ab.account.currency);
    }
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
      // Skip TRANSFER_TO_SAVINGS from expense/income totals (handled by savingsDeducted)
      if (t.type === 'TRANSFER_TO_SAVINGS') continue;

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
    const recentFilters: TransactionFilters = {
      userId,
      page: 1,
      limit: 10,
      ...(accountId && { accountId }),
    };
    const recent = await transactionRepository.findMany(recentFilters);

    // Note: savingsDeducted and totalSaved are user-scoped, not account-scoped.
    // Savings goals are account-agnostic in the current data model.

    // Deduct savings that affect balance
    const savingsDeducted = await savingsService.getDeductedSavingsTotal(userId);

    // Total saved across all goals
    const allGoals = await prisma.savingsGoal.aggregate({
      where: { userId },
      _sum: { currentAmount: true },
    });
    const totalSaved = Math.round(Number(allGoals._sum.currentAmount ?? 0) * 100) / 100;

    // All-time balance across all accounts, converted to primary currency
    let allTimeBalance = 0;
    for (const ab of accountBalances) {
      const converted = this.convertToTarget(
        ab.balance,
        ab.account.currency,
        primaryCurrency,
        ratesByCurrency,
      );
      allTimeBalance += converted;
    }

    const stats: DashboardStats = {
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      balance: Math.round((totalIncome - totalExpenses - savingsDeducted) * 100) / 100,
      allTimeBalance: Math.round(allTimeBalance * 100) / 100,
      savingsDeducted: Math.round(savingsDeducted * 100) / 100,
      totalSaved,
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
      const keys = await redis.keys(`dashboard:${userId}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch {
      // Redis unavailable
    }
  }

  private formatTransaction(t: {
    id: string;
    amount: unknown;
    currency: string;
    type: 'EXPENSE' | 'INCOME' | 'TRANSFER_TO_SAVINGS';
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
