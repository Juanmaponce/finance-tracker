import { accountService } from '../account.service';
import { accountRepository } from '../account.repository';
import { prisma } from '../../../lib/prisma';
import { redis } from '../../../lib/redis';
import { NotFoundError, ForbiddenError, ValidationError } from '../../../lib/errors';

jest.mock('../account.repository', () => ({
  accountRepository: {
    findByUserId: jest.fn(),
    findById: jest.fn(),
    findDuplicate: jest.fn(),
    findDefault: jest.fn(),
    getMaxSortOrder: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    reorder: jest.fn(),
    countTransactions: jest.fn(),
    getTransactionStatsByAccount: jest.fn(),
    getMonthlyTransactionStatsByAccount: jest.fn(),
  },
}));

const mockedRepo = accountRepository as jest.Mocked<typeof accountRepository>;
const mockedPrisma = prisma as jest.Mocked<typeof prisma>;

const makeAccount = (overrides = {}) => ({
  id: 'acc-1',
  userId: 'user-123',
  name: 'Main Account',
  currency: 'USD',
  icon: null,
  color: '#00B9AE',
  isDefault: false,
  sortOrder: 1,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-15'),
  ...overrides,
});

describe('AccountService', () => {
  const userId = 'user-123';
  const accountId = 'acc-1';

  beforeEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should return accounts for user', async () => {
      const accounts = [makeAccount()];
      mockedRepo.findByUserId.mockResolvedValue(accounts as never);

      const result = await accountService.list(userId);

      expect(mockedRepo.findByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual(accounts);
    });
  });

  describe('create', () => {
    it('should create an account successfully', async () => {
      const data = { name: 'Savings', currency: 'USD' };
      mockedRepo.findDuplicate.mockResolvedValue(null);
      mockedRepo.getMaxSortOrder.mockResolvedValue(2);
      mockedRepo.create.mockResolvedValue(makeAccount({ name: 'Savings', sortOrder: 3 }) as never);

      const result = await accountService.create(userId, data);

      expect(mockedRepo.create).toHaveBeenCalledWith({
        userId,
        name: 'Savings',
        currency: 'USD',
        icon: undefined,
        color: '#00B9AE',
        sortOrder: 3,
      });
      expect(result.name).toBe('Savings');
    });

    it('should throw ValidationError if duplicate name', async () => {
      mockedRepo.findDuplicate.mockResolvedValue({ id: 'existing' } as never);

      await expect(
        accountService.create(userId, { name: 'Main Account', currency: 'USD' }),
      ).rejects.toThrow(ValidationError);
    });

    it('should invalidate cache after creation', async () => {
      mockedRepo.findDuplicate.mockResolvedValue(null);
      mockedRepo.getMaxSortOrder.mockResolvedValue(0);
      mockedRepo.create.mockResolvedValue(makeAccount() as never);

      await accountService.create(userId, { name: 'New', currency: 'USD' });

      expect(redis.del).toHaveBeenCalledWith(`dashboard:${userId}`);
    });
  });

  describe('update', () => {
    it('should update an account successfully', async () => {
      mockedRepo.findById.mockResolvedValue(makeAccount() as never);
      mockedRepo.findDuplicate.mockResolvedValue(null);
      mockedRepo.update.mockResolvedValue(makeAccount({ name: 'Updated' }) as never);

      const result = await accountService.update(userId, accountId, { name: 'Updated' });

      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundError if account not found', async () => {
      mockedRepo.findById.mockResolvedValue(null);

      await expect(accountService.update(userId, accountId, { name: 'X' })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw ForbiddenError if user does not own the account', async () => {
      mockedRepo.findById.mockResolvedValue(makeAccount({ userId: 'other' }) as never);

      await expect(accountService.update(userId, accountId, { name: 'X' })).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('should throw ValidationError if duplicate name on update', async () => {
      mockedRepo.findById.mockResolvedValue(makeAccount() as never);
      mockedRepo.findDuplicate.mockResolvedValue({ id: 'other-acc' } as never);

      await expect(accountService.update(userId, accountId, { name: 'Duplicate' })).rejects.toThrow(
        ValidationError,
      );
    });

    it('should skip duplicate check when name is not provided', async () => {
      mockedRepo.findById.mockResolvedValue(makeAccount() as never);
      mockedRepo.update.mockResolvedValue(makeAccount({ color: '#FF0000' }) as never);

      const result = await accountService.update(userId, accountId, { color: '#FF0000' });

      expect(mockedRepo.findDuplicate).not.toHaveBeenCalled();
      expect(result.color).toBe('#FF0000');
    });

    it('should invalidate cache after update', async () => {
      mockedRepo.findById.mockResolvedValue(makeAccount() as never);
      mockedRepo.findDuplicate.mockResolvedValue(null);
      mockedRepo.update.mockResolvedValue(makeAccount({ name: 'Updated' }) as never);

      await accountService.update(userId, accountId, { name: 'Updated' });

      expect(redis.del).toHaveBeenCalledWith(`dashboard:${userId}`);
    });
  });

  describe('delete', () => {
    it('should delete an account successfully', async () => {
      mockedRepo.findById.mockResolvedValue(makeAccount() as never);
      mockedRepo.countTransactions.mockResolvedValue(0);

      await accountService.delete(userId, accountId);

      expect(mockedRepo.delete).toHaveBeenCalledWith(accountId);
    });

    it('should throw NotFoundError if account not found', async () => {
      mockedRepo.findById.mockResolvedValue(null);

      await expect(accountService.delete(userId, accountId)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user does not own the account', async () => {
      mockedRepo.findById.mockResolvedValue(makeAccount({ userId: 'other' }) as never);

      await expect(accountService.delete(userId, accountId)).rejects.toThrow(ForbiddenError);
    });

    it('should throw ValidationError if account is default', async () => {
      mockedRepo.findById.mockResolvedValue(makeAccount({ isDefault: true }) as never);

      await expect(accountService.delete(userId, accountId)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if account has transactions', async () => {
      mockedRepo.findById.mockResolvedValue(makeAccount() as never);
      mockedRepo.countTransactions.mockResolvedValue(5);

      await expect(accountService.delete(userId, accountId)).rejects.toThrow(ValidationError);
    });

    it('should invalidate cache after deletion', async () => {
      mockedRepo.findById.mockResolvedValue(makeAccount() as never);
      mockedRepo.countTransactions.mockResolvedValue(0);

      await accountService.delete(userId, accountId);

      expect(redis.del).toHaveBeenCalledWith(`dashboard:${userId}`);
    });
  });

  describe('getBalance', () => {
    it('should calculate balance for an account', async () => {
      const account = makeAccount();
      mockedRepo.findById.mockResolvedValue(account as never);
      mockedRepo.getTransactionStatsByAccount.mockResolvedValue([
        { type: 'INCOME', _sum: { amount: 5000 } },
        { type: 'EXPENSE', _sum: { amount: 1500 } },
        { type: 'TRANSFER_TO_SAVINGS', _sum: { amount: 200 } },
      ] as never);
      mockedRepo.getMonthlyTransactionStatsByAccount.mockResolvedValue([
        { type: 'INCOME', _sum: { amount: 2000 } },
        { type: 'EXPENSE', _sum: { amount: 800 } },
      ] as never);
      (mockedPrisma.savingsGoal.aggregate as jest.Mock).mockResolvedValue({
        _sum: { currentAmount: 300 },
      });

      const result = await accountService.getBalance(userId, accountId);

      expect(result.totalIncome).toBe(5000);
      expect(result.totalExpenses).toBe(1500);
      expect(result.balance).toBe(3300); // 5000 - 1500 - 200
      expect(result.monthlyIncome).toBe(2000);
      expect(result.monthlyExpenses).toBe(800);
      expect(result.totalSaved).toBe(300);
    });

    it('should throw NotFoundError if account not found', async () => {
      mockedRepo.findById.mockResolvedValue(null);

      await expect(accountService.getBalance(userId, accountId)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user does not own the account', async () => {
      mockedRepo.findById.mockResolvedValue(makeAccount({ userId: 'other' }) as never);

      await expect(accountService.getBalance(userId, accountId)).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getAllBalances', () => {
    it('should return balances for all accounts', async () => {
      mockedRepo.findByUserId.mockResolvedValue([makeAccount()] as never);
      mockedRepo.getTransactionStatsByAccount.mockResolvedValue([] as never);
      mockedRepo.getMonthlyTransactionStatsByAccount.mockResolvedValue([] as never);
      (mockedPrisma.savingsGoal.aggregate as jest.Mock).mockResolvedValue({
        _sum: { currentAmount: null },
      });

      const result = await accountService.getAllBalances(userId);

      expect(result).toHaveLength(1);
      expect(result[0].balance).toBe(0);
      expect(result[0].totalSaved).toBe(0);
    });
  });

  describe('reorder', () => {
    it('should delegate to repository', async () => {
      const accountIds = ['acc-2', 'acc-1', 'acc-3'];

      await accountService.reorder(userId, accountIds);

      expect(mockedRepo.reorder).toHaveBeenCalledWith(userId, accountIds);
    });
  });

  describe('getDefaultAccount', () => {
    it('should delegate to repository', async () => {
      const defaultAcc = makeAccount({ isDefault: true });
      mockedRepo.findDefault.mockResolvedValue(defaultAcc as never);

      const result = await accountService.getDefaultAccount(userId);

      expect(mockedRepo.findDefault).toHaveBeenCalledWith(userId);
      expect(result).toEqual(defaultAcc);
    });
  });
});
