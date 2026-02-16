import { savingsService } from '../savings.service';
import { savingsRepository } from '../savings.repository';
import { accountRepository } from '../../accounts/account.repository';
import { categoryRepository } from '../../categories/category.repository';
import { accountService } from '../../accounts/account.service';
import { redis } from '../../../lib/redis';
import { NotFoundError, ForbiddenError, ValidationError } from '../../../lib/errors';

jest.mock('../savings.repository', () => ({
  savingsRepository: {
    findByUserId: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deposit: jest.fn(),
    delete: jest.fn(),
    findDepositsByGoalId: jest.fn(),
    getDeductedSavingsTotal: jest.fn(),
  },
}));

jest.mock('../../accounts/account.repository', () => ({
  accountRepository: {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    getTransactionStatsByAccount: jest.fn(),
  },
}));

jest.mock('../../categories/category.repository', () => ({
  categoryRepository: {
    findByUserIdAndName: jest.fn(),
    create: jest.fn(),
  },
}));

jest.mock('../../accounts/account.service', () => ({
  accountService: {
    getDefaultAccount: jest.fn(),
  },
}));

const mockedRepo = savingsRepository as jest.Mocked<typeof savingsRepository>;
const mockedAccountRepo = accountRepository as jest.Mocked<typeof accountRepository>;
const mockedCategoryRepo = categoryRepository as jest.Mocked<typeof categoryRepository>;
const mockedAccountService = accountService as jest.Mocked<typeof accountService>;

const makeGoal = (overrides = {}) => ({
  id: 'goal-1',
  name: 'Vacation',
  targetAmount: '1000.00' as unknown,
  currentAmount: '250.00' as unknown,
  currency: 'USD',
  deadline: null,
  deductFromBalance: false,
  defaultAccountId: null,
  defaultAccount: null,
  userId: 'user-123',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-15'),
  ...overrides,
});

describe('SavingsService', () => {
  const userId = 'user-123';
  const goalId = 'goal-1';

  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return formatted goals', async () => {
      mockedRepo.findByUserId.mockResolvedValue([makeGoal()] as never);

      const result = await savingsService.list(userId);

      expect(result).toHaveLength(1);
      expect(result[0].targetAmount).toBe(1000);
      expect(result[0].currentAmount).toBe(250);
      expect(result[0].progress).toBe(25);
    });
  });

  describe('create', () => {
    it('should create a savings goal', async () => {
      const data = { name: 'Vacation', targetAmount: 1000, currency: 'USD' };
      mockedRepo.create.mockResolvedValue(makeGoal() as never);

      const result = await savingsService.create(userId, data);

      expect(mockedRepo.create).toHaveBeenCalledWith({
        userId,
        name: 'Vacation',
        targetAmount: 1000,
        currency: 'USD',
        deadline: undefined,
        deductFromBalance: undefined,
        defaultAccountId: undefined,
      });
      expect(result.progress).toBe(25);
    });

    it('should validate account when defaultAccountId provided', async () => {
      const data = { name: 'Car', targetAmount: 5000, currency: 'USD', defaultAccountId: 'acc-1' };
      mockedAccountRepo.findById.mockResolvedValue({
        id: 'acc-1',
        userId,
        currency: 'USD',
      } as never);
      mockedRepo.create.mockResolvedValue(makeGoal() as never);

      await savingsService.create(userId, data);

      expect(mockedAccountRepo.findById).toHaveBeenCalledWith('acc-1');
    });

    it('should throw if account currency does not match', async () => {
      const data = { name: 'Car', targetAmount: 5000, currency: 'USD', defaultAccountId: 'acc-1' };
      mockedAccountRepo.findById.mockResolvedValue({
        id: 'acc-1',
        userId,
        currency: 'EUR',
      } as never);

      await expect(savingsService.create(userId, data)).rejects.toThrow(ValidationError);
    });
  });

  describe('update', () => {
    it('should update a savings goal', async () => {
      mockedRepo.findById.mockResolvedValue(makeGoal() as never);
      mockedRepo.update.mockResolvedValue(makeGoal({ name: 'Trip' }) as never);

      const result = await savingsService.update(userId, goalId, { name: 'Trip' });

      expect(result.name).toBe('Trip');
    });

    it('should throw NotFoundError if goal not found', async () => {
      mockedRepo.findById.mockResolvedValue(null);

      await expect(savingsService.update(userId, goalId, { name: 'X' })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw ForbiddenError if user does not own the goal', async () => {
      mockedRepo.findById.mockResolvedValue(makeGoal({ userId: 'other' }) as never);

      await expect(savingsService.update(userId, goalId, { name: 'X' })).rejects.toThrow(
        ForbiddenError,
      );
    });
  });

  describe('deposit', () => {
    it('should deposit without deducting from balance', async () => {
      mockedRepo.findById.mockResolvedValue(makeGoal() as never);
      mockedRepo.deposit.mockResolvedValue(
        makeGoal({ currentAmount: '350.00' as unknown }) as never,
      );

      const result = await savingsService.deposit(userId, goalId, { amount: 100 });

      expect(result.currentAmount).toBe(350);
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('should throw ValidationError if deposit exceeds target', async () => {
      mockedRepo.findById.mockResolvedValue(makeGoal() as never);

      await expect(savingsService.deposit(userId, goalId, { amount: 800 })).rejects.toThrow(
        ValidationError,
      );
    });

    it('should throw NotFoundError if goal not found', async () => {
      mockedRepo.findById.mockResolvedValue(null);

      await expect(savingsService.deposit(userId, goalId, { amount: 100 })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw ForbiddenError if user does not own the goal', async () => {
      mockedRepo.findById.mockResolvedValue(makeGoal({ userId: 'other' }) as never);

      await expect(savingsService.deposit(userId, goalId, { amount: 100 })).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('should deduct from balance and invalidate cache when deductFromBalance is true', async () => {
      const goal = makeGoal({ deductFromBalance: true, defaultAccountId: 'acc-1' });
      mockedRepo.findById.mockResolvedValue(goal as never);
      mockedAccountRepo.findById.mockResolvedValue({
        id: 'acc-1',
        userId,
        currency: 'USD',
      } as never);
      mockedAccountRepo.getTransactionStatsByAccount.mockResolvedValue([
        { type: 'INCOME', _sum: { amount: 1000 } },
        { type: 'EXPENSE', _sum: { amount: 200 } },
      ] as never);
      mockedCategoryRepo.findByUserIdAndName.mockResolvedValue({ id: 'cat-savings' } as never);
      mockedRepo.deposit.mockResolvedValue(makeGoal({ currentAmount: '350.00' }) as never);

      await savingsService.deposit(userId, goalId, { amount: 100 });

      expect(redis.del).toHaveBeenCalledWith(`dashboard:${userId}`);
    });

    it('should fall back to default account when no accountId and no defaultAccountId', async () => {
      const goal = makeGoal({ deductFromBalance: true, defaultAccountId: null });
      mockedRepo.findById.mockResolvedValue(goal as never);
      mockedAccountService.getDefaultAccount.mockResolvedValue({ id: 'default-acc' } as never);
      mockedCategoryRepo.findByUserIdAndName.mockResolvedValue({ id: 'cat-savings' } as never);
      mockedRepo.deposit.mockResolvedValue(makeGoal({ currentAmount: '350.00' }) as never);

      await savingsService.deposit(userId, goalId, { amount: 100 });

      expect(mockedAccountService.getDefaultAccount).toHaveBeenCalledWith(userId);
    });

    it('should validate account balance when deducting from specific account', async () => {
      const goal = makeGoal({ deductFromBalance: true, defaultAccountId: 'acc-1' });
      mockedRepo.findById.mockResolvedValue(goal as never);
      mockedAccountRepo.findById.mockResolvedValue({
        id: 'acc-1',
        userId,
        currency: 'USD',
      } as never);
      // Balance: 100 income - 80 expense = 20 available
      mockedAccountRepo.getTransactionStatsByAccount.mockResolvedValue([
        { type: 'INCOME', _sum: { amount: 100 } },
        { type: 'EXPENSE', _sum: { amount: 80 } },
      ] as never);

      await expect(savingsService.deposit(userId, goalId, { amount: 50 })).rejects.toThrow(
        ValidationError,
      );
    });

    it('should use explicit accountId over defaultAccountId when provided', async () => {
      const goal = makeGoal({ deductFromBalance: true, defaultAccountId: 'acc-default' });
      mockedRepo.findById.mockResolvedValue(goal as never);
      mockedAccountRepo.findById.mockResolvedValue({
        id: 'acc-explicit',
        userId,
        currency: 'USD',
      } as never);
      mockedAccountRepo.getTransactionStatsByAccount.mockResolvedValue([
        { type: 'INCOME', _sum: { amount: 1000 } },
      ] as never);
      mockedCategoryRepo.findByUserIdAndName.mockResolvedValue({ id: 'cat-savings' } as never);
      mockedRepo.deposit.mockResolvedValue(makeGoal({ currentAmount: '350.00' }) as never);

      await savingsService.deposit(userId, goalId, { amount: 100, accountId: 'acc-explicit' });

      expect(mockedAccountRepo.findById).toHaveBeenCalledWith('acc-explicit');
    });

    it('should create savings category if it does not exist', async () => {
      const goal = makeGoal({ deductFromBalance: true, defaultAccountId: null });
      mockedRepo.findById.mockResolvedValue(goal as never);
      mockedAccountService.getDefaultAccount.mockResolvedValue({ id: 'default-acc' } as never);
      mockedCategoryRepo.findByUserIdAndName.mockResolvedValue(null);
      mockedCategoryRepo.create.mockResolvedValue({ id: 'new-cat-savings' } as never);
      mockedRepo.deposit.mockResolvedValue(makeGoal({ currentAmount: '350.00' }) as never);

      await savingsService.deposit(userId, goalId, { amount: 100 });

      expect(mockedCategoryRepo.create).toHaveBeenCalledWith({
        userId,
        name: 'Ahorros',
        icon: 'piggy-bank',
        color: '#10B981',
        type: 'EXPENSE',
        keywords: ['ahorro', 'savings', 'meta'],
      });
    });
  });

  describe('getDeposits', () => {
    it('should return formatted deposits', async () => {
      mockedRepo.findById.mockResolvedValue(makeGoal() as never);
      mockedRepo.findDepositsByGoalId.mockResolvedValue([
        {
          id: 'dep-1',
          amount: '100.00' as unknown,
          currency: 'USD',
          note: 'Monthly',
          date: new Date(),
          createdAt: new Date(),
          account: null,
        },
      ] as never);

      const result = await savingsService.getDeposits(userId, goalId);

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(100);
    });

    it('should throw NotFoundError if goal not found', async () => {
      mockedRepo.findById.mockResolvedValue(null);

      await expect(savingsService.getDeposits(userId, goalId)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user does not own the goal', async () => {
      mockedRepo.findById.mockResolvedValue(makeGoal({ userId: 'other' }) as never);

      await expect(savingsService.getDeposits(userId, goalId)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('delete', () => {
    it('should delete a savings goal', async () => {
      mockedRepo.findById.mockResolvedValue(makeGoal() as never);

      await savingsService.delete(userId, goalId);

      expect(mockedRepo.delete).toHaveBeenCalledWith(goalId);
    });

    it('should throw NotFoundError if goal not found', async () => {
      mockedRepo.findById.mockResolvedValue(null);

      await expect(savingsService.delete(userId, goalId)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user does not own the goal', async () => {
      mockedRepo.findById.mockResolvedValue(makeGoal({ userId: 'other' }) as never);

      await expect(savingsService.delete(userId, goalId)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getDeductedSavingsTotal', () => {
    it('should delegate to repository', async () => {
      mockedRepo.getDeductedSavingsTotal.mockResolvedValue(500 as never);

      const result = await savingsService.getDeductedSavingsTotal(userId);

      expect(result).toBe(500);
    });
  });

  describe('getAvailableAccounts', () => {
    it('should return accounts matching the goal currency with balances', async () => {
      mockedRepo.findById.mockResolvedValue(makeGoal() as never);
      mockedAccountRepo.findByUserId.mockResolvedValue([
        {
          id: 'acc-1',
          name: 'Main',
          currency: 'USD',
          icon: null,
          color: '#000',
          isDefault: true,
          userId,
        },
        {
          id: 'acc-2',
          name: 'Euro',
          currency: 'EUR',
          icon: null,
          color: '#00F',
          isDefault: false,
          userId,
        },
      ] as never);
      mockedAccountRepo.getTransactionStatsByAccount.mockResolvedValue([
        { type: 'INCOME', _sum: { amount: 500 } },
        { type: 'EXPENSE', _sum: { amount: 100 } },
      ] as never);

      const result = await savingsService.getAvailableAccounts(userId, goalId);

      // Only USD account should be returned
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Main');
      expect(result[0].availableBalance).toBe(400);
    });

    it('should throw NotFoundError if goal not found', async () => {
      mockedRepo.findById.mockResolvedValue(null);

      await expect(savingsService.getAvailableAccounts(userId, goalId)).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw ForbiddenError if user does not own the goal', async () => {
      mockedRepo.findById.mockResolvedValue(makeGoal({ userId: 'other' }) as never);

      await expect(savingsService.getAvailableAccounts(userId, goalId)).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('should return empty array when no accounts match currency', async () => {
      mockedRepo.findById.mockResolvedValue(makeGoal({ currency: 'GBP' }) as never);
      mockedAccountRepo.findByUserId.mockResolvedValue([
        {
          id: 'acc-1',
          name: 'Main',
          currency: 'USD',
          icon: null,
          color: '#000',
          isDefault: true,
          userId,
        },
        {
          id: 'acc-2',
          name: 'Euro',
          currency: 'EUR',
          icon: null,
          color: '#00F',
          isDefault: false,
          userId,
        },
      ] as never);

      const result = await savingsService.getAvailableAccounts(userId, goalId);

      expect(result).toHaveLength(0);
    });
  });
});
