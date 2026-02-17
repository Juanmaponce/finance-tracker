import { transactionRepository } from '../transaction.repository';
import { categoryRepository } from '../../categories/category.repository';
import { currencyService } from '../../currency/currency.service';
import { savingsService } from '../../savings/savings.service';
import { accountService } from '../../accounts/account.service';
import { redis } from '../../../lib/redis';
import { prisma } from '../../../lib/prisma';

jest.mock('../transaction.repository');
jest.mock('../../categories/category.repository');
jest.mock('../../currency/currency.service');
jest.mock('../../savings/savings.service');
jest.mock('../../accounts/account.service');

// Import after mocks
import { transactionService } from '../transaction.service';

const mockTransactionRepo = transactionRepository as jest.Mocked<typeof transactionRepository>;
const mockCategoryRepo = categoryRepository as jest.Mocked<typeof categoryRepository>;
const mockCurrencyService = currencyService as jest.Mocked<typeof currencyService>;

describe('TransactionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a transaction with provided categoryId', async () => {
      const mockTx = {
        id: 'tx-1',
        userId: 'user-1',
        amount: 50,
        currency: 'USD',
        type: 'EXPENSE' as const,
        description: 'Lunch',
        date: new Date('2026-02-01'),
        categoryId: 'cat-1',
        receiptUrl: null,
        isRecurring: false,
        createdAt: new Date(),
        category: { id: 'cat-1', name: 'Food', icon: 'utensils', color: '#FF0000' },
      };

      mockTransactionRepo.create.mockResolvedValue(mockTx);

      const result = await transactionService.create('user-1', {
        amount: 50,
        currency: 'USD',
        categoryId: 'cat-1',
        type: 'EXPENSE',
        description: 'Lunch',
        date: '2026-02-01T00:00:00Z',
      });

      expect(result.id).toBe('tx-1');
      expect(result.amount).toBe(50);
      expect(mockTransactionRepo.create).toHaveBeenCalled();
    });

    it('should auto-categorize when no categoryId provided', async () => {
      const categories = [
        {
          id: 'cat-food',
          name: 'Comida',
          icon: 'utensils',
          color: '#FF0000',
          type: 'EXPENSE' as const,
          keywords: ['restaurante', 'comida', 'almuerzo'],
          userId: 'user-1',
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'cat-transport',
          name: 'Transporte',
          icon: 'car',
          color: '#0000FF',
          type: 'EXPENSE' as const,
          keywords: ['uber', 'taxi', 'gasolina'],
          userId: 'user-1',
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockCategoryRepo.findByUserId.mockResolvedValue(categories);

      const mockTx = {
        id: 'tx-2',
        userId: 'user-1',
        amount: 30,
        currency: 'USD',
        type: 'EXPENSE' as const,
        description: 'Almuerzo en restaurante',
        date: new Date('2026-02-01'),
        categoryId: 'cat-food',
        receiptUrl: null,
        isRecurring: false,
        createdAt: new Date(),
        category: { id: 'cat-food', name: 'Comida', icon: 'utensils', color: '#FF0000' },
      };

      mockTransactionRepo.create.mockResolvedValue(mockTx);

      await transactionService.create('user-1', {
        amount: 30,
        currency: 'USD',
        type: 'EXPENSE',
        description: 'Almuerzo en restaurante',
        date: '2026-02-01T00:00:00Z',
      });

      // Should have called category repo to find categories for auto-categorization
      expect(mockCategoryRepo.findByUserId).toHaveBeenCalledWith('user-1', 'EXPENSE');
      // Should have created with the food category (best match for "almuerzo" + "restaurante")
      expect(mockTransactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'cat-food' }),
      );
    });
  });

  describe('getById', () => {
    it('should return formatted transaction for owner', async () => {
      const mockTx = {
        id: 'tx-1',
        userId: 'user-1',
        amount: 50,
        currency: 'USD',
        type: 'EXPENSE' as const,
        description: 'Test',
        date: new Date(),
        categoryId: 'cat-1',
        receiptUrl: null,
        isRecurring: false,
        createdAt: new Date(),
        category: { id: 'cat-1', name: 'Food', icon: 'utensils', color: '#FF0000' },
      };

      mockTransactionRepo.findById.mockResolvedValue(mockTx);

      const result = await transactionService.getById('user-1', 'tx-1');
      expect(result.id).toBe('tx-1');
      expect(typeof result.amount).toBe('number');
    });

    it('should throw NotFoundError for missing transaction', async () => {
      mockTransactionRepo.findById.mockResolvedValue(null);

      await expect(transactionService.getById('user-1', 'not-found')).rejects.toThrow(
        'Transaction not found',
      );
    });

    it('should throw ForbiddenError for non-owner', async () => {
      const mockTx = {
        id: 'tx-1',
        userId: 'other-user',
        amount: 50,
        currency: 'USD',
        type: 'EXPENSE' as const,
        description: 'Test',
        date: new Date(),
        categoryId: 'cat-1',
        receiptUrl: null,
        isRecurring: false,
        createdAt: new Date(),
        category: { id: 'cat-1', name: 'Food', icon: 'utensils', color: '#FF0000' },
      };

      mockTransactionRepo.findById.mockResolvedValue(mockTx);

      await expect(transactionService.getById('user-1', 'tx-1')).rejects.toThrow('Access denied');
    });
  });

  describe('formatTransaction', () => {
    it('should convert Decimal amount to number', async () => {
      const mockTx = {
        id: 'tx-1',
        userId: 'user-1',
        amount: { toNumber: () => 99.99 } as unknown, // Prisma Decimal
        currency: 'USD',
        type: 'EXPENSE' as const,
        description: null,
        date: new Date(),
        categoryId: 'cat-1',
        receiptUrl: null,
        isRecurring: false,
        createdAt: new Date(),
        category: { id: 'cat-1', name: 'Food', icon: 'utensils', color: '#FF0000' },
      };

      mockTransactionRepo.findById.mockResolvedValue(mockTx);

      const result = await transactionService.getById('user-1', 'tx-1');
      expect(typeof result.amount).toBe('number');
    });
  });

  describe('delete', () => {
    it('should soft delete transaction for owner', async () => {
      const mockTx = {
        id: 'tx-1',
        userId: 'user-1',
        amount: 50,
        currency: 'USD',
        type: 'EXPENSE' as const,
        description: 'Test',
        date: new Date(),
        categoryId: 'cat-1',
        receiptUrl: null,
        isRecurring: false,
        createdAt: new Date(),
        category: { id: 'cat-1', name: 'Food', icon: 'utensils', color: '#FF0000' },
      };

      mockTransactionRepo.findById.mockResolvedValue(mockTx);
      mockTransactionRepo.softDelete.mockResolvedValue(undefined as never);

      await transactionService.delete('user-1', 'tx-1');
      expect(mockTransactionRepo.softDelete).toHaveBeenCalledWith('tx-1');
    });
  });

  describe('getDashboardStats', () => {
    it('should return cached stats when available', async () => {
      const cached = {
        totalExpenses: 500,
        totalIncome: 1000,
        balance: 500,
        expensesByCategory: [],
        recentTransactions: [],
      };

      (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(cached));

      const result = await transactionService.getDashboardStats('user-1');
      expect(result).toEqual(cached);
    });

    it('should calculate stats from transactions when cache misses', async () => {
      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ primaryCurrency: 'USD' });
      (accountService.getAllBalances as jest.Mock).mockResolvedValueOnce([]);
      (savingsService.getDeductedSavingsTotal as jest.Mock).mockResolvedValueOnce(0);
      (prisma.savingsGoal.aggregate as jest.Mock).mockResolvedValueOnce({
        _sum: { currentAmount: 0 },
      });

      const mockTransactions = [
        {
          amount: 100,
          currency: 'USD',
          type: 'EXPENSE',
          categoryId: 'cat-1',
          category: { name: 'Food', icon: 'utensils', color: '#FF0000' },
        },
        {
          amount: 200,
          currency: 'USD',
          type: 'INCOME',
          categoryId: 'cat-2',
          category: { name: 'Salary', icon: 'wallet', color: '#00FF00' },
        },
      ];

      mockTransactionRepo.getStats.mockResolvedValue(mockTransactions as never);
      mockTransactionRepo.findMany.mockResolvedValue([]);

      const result = await transactionService.getDashboardStats('user-1');

      expect(result.totalExpenses).toBe(100);
      expect(result.totalIncome).toBe(200);
      expect(result.balance).toBe(100);
    });

    it('should pass accountId to repository when provided', async () => {
      const userId = 'user-1';
      const accountId = 'account-1';

      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ primaryCurrency: 'USD' });
      (accountService.getAllBalances as jest.Mock).mockResolvedValueOnce([]);
      (savingsService.getDeductedSavingsTotal as jest.Mock).mockResolvedValueOnce(0);
      (prisma.savingsGoal.aggregate as jest.Mock).mockResolvedValueOnce({
        _sum: { currentAmount: 0 },
      });
      mockTransactionRepo.getStats.mockResolvedValue([] as never);
      mockTransactionRepo.findMany.mockResolvedValue([]);

      await transactionService.getDashboardStats(userId, accountId);

      expect(mockTransactionRepo.getStats).toHaveBeenCalledWith(
        userId,
        expect.any(Date),
        expect.any(Date),
        accountId,
      );
      expect(mockTransactionRepo.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ accountId }),
      );
    });

    it('should not pass accountId to repository when not provided', async () => {
      const userId = 'user-1';

      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ primaryCurrency: 'USD' });
      (accountService.getAllBalances as jest.Mock).mockResolvedValueOnce([]);
      (savingsService.getDeductedSavingsTotal as jest.Mock).mockResolvedValueOnce(0);
      (prisma.savingsGoal.aggregate as jest.Mock).mockResolvedValueOnce({
        _sum: { currentAmount: 0 },
      });
      mockTransactionRepo.getStats.mockResolvedValue([] as never);
      mockTransactionRepo.findMany.mockResolvedValue([]);

      await transactionService.getDashboardStats(userId);

      expect(mockTransactionRepo.getStats).toHaveBeenCalledWith(
        userId,
        expect.any(Date),
        expect.any(Date),
        undefined,
      );
    });

    it('should include accountId in cache key', async () => {
      const userId = 'user-1';
      const accountId = 'account-1';

      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce({ primaryCurrency: 'USD' });
      (accountService.getAllBalances as jest.Mock).mockResolvedValueOnce([]);
      (savingsService.getDeductedSavingsTotal as jest.Mock).mockResolvedValueOnce(0);
      (prisma.savingsGoal.aggregate as jest.Mock).mockResolvedValueOnce({
        _sum: { currentAmount: 0 },
      });
      mockTransactionRepo.getStats.mockResolvedValue([] as never);
      mockTransactionRepo.findMany.mockResolvedValue([]);

      await transactionService.getDashboardStats(userId, accountId);

      expect(redis.set).toHaveBeenCalledWith(
        `dashboard:${userId}:${accountId}`,
        expect.any(String),
        'EX',
        expect.any(Number),
      );
    });
  });
});
