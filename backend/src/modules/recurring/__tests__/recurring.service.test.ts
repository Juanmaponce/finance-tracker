import { recurringService } from '../recurring.service';
import { recurringRepository } from '../recurring.repository';
import { prisma } from '../../../lib/prisma';
import { redis } from '../../../lib/redis';
import { accountService } from '../../accounts/account.service';
import { NotFoundError, ForbiddenError } from '../../../lib/errors';

jest.mock('../recurring.repository', () => ({
  recurringRepository: {
    findByUserId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    toggleActive: jest.fn(),
    delete: jest.fn(),
    findDueForExecution: jest.fn(),
  },
}));

jest.mock('../../accounts/account.service', () => ({
  accountService: {
    getDefaultAccount: jest.fn(),
  },
}));

const mockedRepo = recurringRepository as jest.Mocked<typeof recurringRepository>;
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;
const mockedAccountService = accountService as jest.Mocked<typeof accountService>;

describe('RecurringService', () => {
  const userId = 'user-123';
  const recurringId = 'rec-1';

  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return recurring transactions for user', async () => {
      const items = [{ id: recurringId, userId }];
      mockedRepo.findByUserId.mockResolvedValue(items as never);

      const result = await recurringService.list(userId);

      expect(mockedRepo.findByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual(items);
    });
  });

  describe('create', () => {
    it('should create a recurring transaction', async () => {
      const data = {
        amount: 100,
        currency: 'USD',
        categoryId: 'cat-1',
        description: 'Netflix',
        frequency: 'MONTHLY' as const,
        nextExecution: '2026-03-01T00:00:00Z',
      };
      const created = { id: recurringId, userId, ...data };
      mockedRepo.create.mockResolvedValue(created as never);

      const result = await recurringService.create(userId, data);

      expect(mockedRepo.create).toHaveBeenCalledWith({
        userId,
        amount: 100,
        currency: 'USD',
        categoryId: 'cat-1',
        description: 'Netflix',
        frequency: 'MONTHLY',
        nextExecution: new Date('2026-03-01T00:00:00Z'),
      });
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    const existing = { id: recurringId, userId, isActive: true };

    it('should update a recurring transaction', async () => {
      mockedRepo.findById.mockResolvedValue(existing as never);
      mockedRepo.update.mockResolvedValue({ ...existing, amount: 200 } as never);

      const result = await recurringService.update(userId, recurringId, { amount: 200 });

      expect(mockedRepo.update).toHaveBeenCalledWith(recurringId, { amount: 200 });
      expect(result).toEqual({ ...existing, amount: 200 });
    });

    it('should only include defined fields in update payload', async () => {
      mockedRepo.findById.mockResolvedValue(existing as never);
      mockedRepo.update.mockResolvedValue(existing as never);

      await recurringService.update(userId, recurringId, { amount: 50, description: 'Updated' });

      expect(mockedRepo.update).toHaveBeenCalledWith(recurringId, {
        amount: 50,
        description: 'Updated',
      });
    });

    it('should convert nextExecution string to Date on update', async () => {
      mockedRepo.findById.mockResolvedValue(existing as never);
      mockedRepo.update.mockResolvedValue(existing as never);

      await recurringService.update(userId, recurringId, {
        nextExecution: '2026-04-01T00:00:00Z',
      });

      expect(mockedRepo.update).toHaveBeenCalledWith(recurringId, {
        nextExecution: new Date('2026-04-01T00:00:00Z'),
      });
    });

    it('should throw NotFoundError if not found', async () => {
      mockedRepo.findById.mockResolvedValue(null);

      await expect(recurringService.update(userId, recurringId, { amount: 200 })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw ForbiddenError if user does not own it', async () => {
      mockedRepo.findById.mockResolvedValue({ ...existing, userId: 'other' } as never);

      await expect(recurringService.update(userId, recurringId, { amount: 200 })).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('toggle', () => {
    it('should toggle active status from true to false', async () => {
      mockedRepo.findById.mockResolvedValue({ id: recurringId, userId, isActive: true } as never);
      mockedRepo.toggleActive.mockResolvedValue({ id: recurringId, isActive: false } as never);

      const result = await recurringService.toggle(userId, recurringId);

      expect(mockedRepo.toggleActive).toHaveBeenCalledWith(recurringId, false);
      expect(result).toEqual({ id: recurringId, isActive: false });
    });

    it('should toggle active status from false to true', async () => {
      mockedRepo.findById.mockResolvedValue({ id: recurringId, userId, isActive: false } as never);
      mockedRepo.toggleActive.mockResolvedValue({ id: recurringId, isActive: true } as never);

      const result = await recurringService.toggle(userId, recurringId);

      expect(mockedRepo.toggleActive).toHaveBeenCalledWith(recurringId, true);
      expect(result).toEqual({ id: recurringId, isActive: true });
    });

    it('should throw NotFoundError if not found', async () => {
      mockedRepo.findById.mockResolvedValue(null);

      await expect(recurringService.toggle(userId, recurringId)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user does not own it', async () => {
      mockedRepo.findById.mockResolvedValue({ id: recurringId, userId: 'other' } as never);

      await expect(recurringService.toggle(userId, recurringId)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('delete', () => {
    it('should delete a recurring transaction', async () => {
      mockedRepo.findById.mockResolvedValue({ id: recurringId, userId } as never);

      await recurringService.delete(userId, recurringId);

      expect(mockedRepo.delete).toHaveBeenCalledWith(recurringId);
    });

    it('should throw NotFoundError if not found', async () => {
      mockedRepo.findById.mockResolvedValue(null);

      await expect(recurringService.delete(userId, recurringId)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user does not own it', async () => {
      mockedRepo.findById.mockResolvedValue({ id: recurringId, userId: 'other' } as never);

      await expect(recurringService.delete(userId, recurringId)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('processRecurring', () => {
    it('should process due recurring transactions as EXPENSE', async () => {
      const dueItems = [
        {
          id: 'rec-1',
          userId: 'user-1',
          amount: 50,
          currency: 'USD',
          categoryId: 'cat-1',
          description: 'Netflix',
          frequency: 'MONTHLY',
          nextExecution: new Date('2026-02-01'),
        },
      ];
      mockedRepo.findDueForExecution.mockResolvedValue(dueItems as never);
      (mockedPrisma.category.findUnique as jest.Mock).mockResolvedValue({ type: 'EXPENSE' });
      mockedAccountService.getDefaultAccount.mockResolvedValue({ id: 'acc-1' } as never);
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        await cb({
          transaction: { create: jest.fn() },
          recurringTransaction: { update: jest.fn() },
        });
      });

      const result = await recurringService.processRecurring();

      expect(result).toEqual({ processed: 1, errors: 0, total: 1 });
    });

    it('should process INCOME category as INCOME type', async () => {
      const dueItems = [
        {
          id: 'rec-1',
          userId: 'user-1',
          amount: 3000,
          currency: 'USD',
          categoryId: 'cat-income',
          description: 'Salary',
          frequency: 'MONTHLY',
          nextExecution: new Date('2026-02-01'),
        },
      ];
      mockedRepo.findDueForExecution.mockResolvedValue(dueItems as never);
      (mockedPrisma.category.findUnique as jest.Mock).mockResolvedValue({ type: 'INCOME' });
      mockedAccountService.getDefaultAccount.mockResolvedValue({ id: 'acc-1' } as never);

      const txCreateFn = jest.fn();
      const recurringUpdateFn = jest.fn();
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        await cb({
          transaction: { create: txCreateFn },
          recurringTransaction: { update: recurringUpdateFn },
        });
      });

      await recurringService.processRecurring();

      expect(txCreateFn).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'INCOME' }),
      });
    });

    it('should invalidate cache after processing', async () => {
      const dueItems = [
        {
          id: 'rec-1',
          userId: 'user-1',
          amount: 50,
          currency: 'USD',
          categoryId: 'cat-1',
          description: 'Netflix',
          frequency: 'MONTHLY',
          nextExecution: new Date('2026-02-01'),
        },
      ];
      mockedRepo.findDueForExecution.mockResolvedValue(dueItems as never);
      (mockedPrisma.category.findUnique as jest.Mock).mockResolvedValue({ type: 'EXPENSE' });
      mockedAccountService.getDefaultAccount.mockResolvedValue({ id: 'acc-1' } as never);
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        await cb({
          transaction: { create: jest.fn() },
          recurringTransaction: { update: jest.fn() },
        });
      });

      await recurringService.processRecurring();

      expect(redis.del).toHaveBeenCalledWith('dashboard:user-1');
    });

    it('should handle errors gracefully and continue processing', async () => {
      const dueItems = [
        {
          id: 'rec-1',
          userId: 'user-1',
          categoryId: 'cat-1',
          frequency: 'MONTHLY',
          nextExecution: new Date(),
        },
        {
          id: 'rec-2',
          userId: 'user-2',
          categoryId: 'cat-2',
          frequency: 'WEEKLY',
          nextExecution: new Date(),
        },
      ];
      mockedRepo.findDueForExecution.mockResolvedValue(dueItems as never);
      (mockedPrisma.category.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await recurringService.processRecurring();

      expect(result.errors).toBe(2);
      expect(result.total).toBe(2);
    });

    it('should return zero counts when nothing is due', async () => {
      mockedRepo.findDueForExecution.mockResolvedValue([]);

      const result = await recurringService.processRecurring();

      expect(result).toEqual({ processed: 0, errors: 0, total: 0 });
    });

    it('should default to EXPENSE when category is not found', async () => {
      const dueItems = [
        {
          id: 'rec-1',
          userId: 'user-1',
          amount: 50,
          currency: 'USD',
          categoryId: 'cat-deleted',
          description: 'Old subscription',
          frequency: 'MONTHLY',
          nextExecution: new Date('2026-02-01'),
        },
      ];
      mockedRepo.findDueForExecution.mockResolvedValue(dueItems as never);
      (mockedPrisma.category.findUnique as jest.Mock).mockResolvedValue(null);
      mockedAccountService.getDefaultAccount.mockResolvedValue({ id: 'acc-1' } as never);

      const txCreateFn = jest.fn();
      (mockedPrisma.$transaction as jest.Mock).mockImplementation(async (cb) => {
        await cb({
          transaction: { create: txCreateFn },
          recurringTransaction: { update: jest.fn() },
        });
      });

      await recurringService.processRecurring();

      expect(txCreateFn).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: 'EXPENSE' }),
      });
    });
  });
});
