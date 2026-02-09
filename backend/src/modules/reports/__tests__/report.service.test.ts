import { redis } from '../../../lib/redis';
import { prisma } from '../../../lib/prisma';
import { currencyService } from '../../currency/currency.service';
import { reportRepository } from '../report.repository';

jest.mock('../report.repository');
jest.mock('../../currency/currency.service');

import { reportService } from '../report.service';

const mockReportRepo = reportRepository as jest.Mocked<typeof reportRepository>;

describe('ReportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('percentChange', () => {
    // percentChange is private, so we test it indirectly through getComparison
    it('should calculate correct percentage change via comparison', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ primaryCurrency: 'USD' });

      // Period 1: expenses = 100
      mockReportRepo.getTransactions.mockResolvedValueOnce([
        {
          amount: 100,
          currency: 'USD',
          type: 'EXPENSE',
          categoryId: 'cat-1',
          category: { name: 'Food', icon: 'utensils', color: '#FF0000' },
          date: new Date('2026-01-15'),
        },
      ]);

      // Period 2: expenses = 150
      mockReportRepo.getTransactions.mockResolvedValueOnce([
        {
          amount: 150,
          currency: 'USD',
          type: 'EXPENSE',
          categoryId: 'cat-1',
          category: { name: 'Food', icon: 'utensils', color: '#FF0000' },
          date: new Date('2026-02-15'),
        },
      ]);

      const result = await reportService.getComparison(
        'user-1',
        '2026-01-01',
        '2026-01-31',
        '2026-02-01',
        '2026-02-28',
      );

      // (150 - 100) / 100 * 100 = 50%
      expect(result.changes.expenses).toBe(50);
    });

    it('should handle previous = 0 correctly', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ primaryCurrency: 'USD' });

      // Period 1: no transactions
      mockReportRepo.getTransactions.mockResolvedValueOnce([]);

      // Period 2: expenses = 100
      mockReportRepo.getTransactions.mockResolvedValueOnce([
        {
          amount: 100,
          currency: 'USD',
          type: 'EXPENSE',
          categoryId: 'cat-1',
          category: { name: 'Food', icon: 'utensils', color: '#FF0000' },
          date: new Date('2026-02-15'),
        },
      ]);

      const result = await reportService.getComparison(
        'user-1',
        '2026-01-01',
        '2026-01-31',
        '2026-02-01',
        '2026-02-28',
      );

      expect(result.changes.expenses).toBe(100);
    });

    it('should return 0 when both periods are 0', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ primaryCurrency: 'USD' });

      mockReportRepo.getTransactions.mockResolvedValueOnce([]);
      mockReportRepo.getTransactions.mockResolvedValueOnce([]);

      const result = await reportService.getComparison(
        'user-1',
        '2026-01-01',
        '2026-01-31',
        '2026-02-01',
        '2026-02-28',
      );

      expect(result.changes.expenses).toBe(0);
      expect(result.changes.income).toBe(0);
    });
  });

  describe('getSummary', () => {
    it('should return cached summary when available', async () => {
      const cached = {
        totalExpenses: 500,
        totalIncome: 1000,
        balance: 500,
        transactionCount: 5,
        avgExpense: 100,
        avgIncome: 200,
        byCategory: [],
        dailyTrend: [],
        currency: 'USD',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      };

      (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(cached));

      const result = await reportService.getSummary({
        userId: 'user-1',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(result).toEqual(cached);
    });

    it('should calculate category percentages correctly', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ primaryCurrency: 'USD' });

      mockReportRepo.getTransactions.mockResolvedValueOnce([
        {
          amount: 300,
          currency: 'USD',
          type: 'EXPENSE',
          categoryId: 'cat-1',
          category: { name: 'Food', icon: 'utensils', color: '#FF0000' },
          date: new Date('2026-01-15'),
        },
        {
          amount: 200,
          currency: 'USD',
          type: 'EXPENSE',
          categoryId: 'cat-2',
          category: { name: 'Transport', icon: 'car', color: '#0000FF' },
          date: new Date('2026-01-16'),
        },
      ]);

      const result = await reportService.getSummary({
        userId: 'user-1',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(result.totalExpenses).toBe(500);
      expect(result.byCategory).toHaveLength(2);
      expect(result.byCategory[0]!.percentage).toBe(60);
      expect(result.byCategory[1]!.percentage).toBe(40);
    });

    it('should fill daily trend with all dates in range', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ primaryCurrency: 'USD' });

      mockReportRepo.getTransactions.mockResolvedValueOnce([
        {
          amount: 100,
          currency: 'USD',
          type: 'EXPENSE',
          categoryId: 'cat-1',
          category: { name: 'Food', icon: 'utensils', color: '#FF0000' },
          date: new Date('2026-01-02'),
        },
      ]);

      const result = await reportService.getSummary({
        userId: 'user-1',
        startDate: '2026-01-01',
        endDate: '2026-01-03',
      });

      // Should have 3 days: Jan 1, 2, 3
      expect(result.dailyTrend).toHaveLength(3);
      expect(result.dailyTrend[0]!.date).toBe('2026-01-01');
      expect(result.dailyTrend[0]!.expenses).toBe(0);
      expect(result.dailyTrend[1]!.date).toBe('2026-01-02');
      expect(result.dailyTrend[1]!.expenses).toBe(100);
      expect(result.dailyTrend[2]!.date).toBe('2026-01-03');
      expect(result.dailyTrend[2]!.expenses).toBe(0);
    });
  });
});
