import { prisma } from '../../lib/prisma';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors';
import { redis } from '../../lib/redis';
import { accountRepository } from './account.repository';
import type {
  CreateAccountDTO,
  UpdateAccountDTO,
  AccountBalance,
  AccountResponse,
} from './account.types';

class AccountService {
  async list(userId: string): Promise<AccountResponse[]> {
    const accounts = await accountRepository.findByUserId(userId);
    return accounts;
  }

  async create(userId: string, data: CreateAccountDTO): Promise<AccountResponse> {
    const duplicate = await accountRepository.findDuplicate(userId, data.name);
    if (duplicate) {
      throw new ValidationError('Ya existe una cuenta con ese nombre');
    }

    const maxSort = await accountRepository.getMaxSortOrder(userId);

    const account = await accountRepository.create({
      userId,
      name: data.name,
      currency: data.currency,
      icon: data.icon,
      color: data.color || '#00B9AE',
      sortOrder: maxSort + 1,
    });

    await this.invalidateCache(userId);
    return account;
  }

  async update(userId: string, id: string, data: UpdateAccountDTO): Promise<AccountResponse> {
    const account = await accountRepository.findById(id);
    if (!account) throw new NotFoundError('Cuenta no encontrada');
    if (account.userId !== userId) throw new ForbiddenError('Acceso denegado');

    if (data.name) {
      const duplicate = await accountRepository.findDuplicate(userId, data.name, id);
      if (duplicate) {
        throw new ValidationError('Ya existe una cuenta con ese nombre');
      }
    }

    const updated = await accountRepository.update(id, data);
    await this.invalidateCache(userId);
    return updated;
  }

  async delete(userId: string, id: string): Promise<void> {
    const account = await accountRepository.findById(id);
    if (!account) throw new NotFoundError('Cuenta no encontrada');
    if (account.userId !== userId) throw new ForbiddenError('Acceso denegado');

    if (account.isDefault) {
      throw new ValidationError('No puedes eliminar la cuenta por defecto');
    }

    const txCount = await accountRepository.countTransactions(id);
    if (txCount > 0) {
      throw new ValidationError(
        'No puedes eliminar una cuenta con transacciones. Primero muevelas a otra cuenta.',
      );
    }

    await accountRepository.delete(id);
    await this.invalidateCache(userId);
  }

  async getBalance(userId: string, accountId: string): Promise<AccountBalance> {
    const account = await accountRepository.findById(accountId);
    if (!account) throw new NotFoundError('Cuenta no encontrada');
    if (account.userId !== userId) throw new ForbiddenError('Acceso denegado');

    return this.calculateBalance(account);
  }

  async getAllBalances(userId: string): Promise<AccountBalance[]> {
    const accounts = await accountRepository.findByUserId(userId);
    return Promise.all(accounts.map((account) => this.calculateBalance(account)));
  }

  async reorder(userId: string, accountIds: string[]): Promise<void> {
    await accountRepository.reorder(userId, accountIds);
  }

  async getDefaultAccount(userId: string) {
    return accountRepository.findDefault(userId);
  }

  async getAvailableBalance(accountId: string): Promise<number> {
    const stats = await accountRepository.getTransactionStatsByAccount(accountId);
    const totalIncome = Number(stats.find((s) => s.type === 'INCOME')?._sum.amount ?? 0);
    const totalExpenses = Number(stats.find((s) => s.type === 'EXPENSE')?._sum.amount ?? 0);
    const transferToSavings = Number(
      stats.find((s) => s.type === 'TRANSFER_TO_SAVINGS')?._sum.amount ?? 0,
    );
    return Math.round((totalIncome - totalExpenses - transferToSavings) * 100) / 100;
  }

  private async calculateBalance(account: AccountResponse): Promise<AccountBalance> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allTimeStats, monthlyStats, savedAmount] = await Promise.all([
      accountRepository.getTransactionStatsByAccount(account.id),
      accountRepository.getMonthlyTransactionStatsByAccount(account.id, startOfMonth),
      prisma.savingsGoal.aggregate({
        where: { userId: account.userId, currency: account.currency },
        _sum: { currentAmount: true },
      }),
    ]);

    const totalIncome = Number(allTimeStats.find((s) => s.type === 'INCOME')?._sum.amount ?? 0);
    const totalExpenses = Number(allTimeStats.find((s) => s.type === 'EXPENSE')?._sum.amount ?? 0);
    const transferToSavings = Number(
      allTimeStats.find((s) => s.type === 'TRANSFER_TO_SAVINGS')?._sum.amount ?? 0,
    );
    const monthlyIncome = Number(monthlyStats.find((s) => s.type === 'INCOME')?._sum.amount ?? 0);
    const monthlyExpenses = Number(
      monthlyStats.find((s) => s.type === 'EXPENSE')?._sum.amount ?? 0,
    );
    const totalSaved = Number(savedAmount._sum.currentAmount ?? 0);

    return {
      accountId: account.id,
      account,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      balance: Math.round((totalIncome - totalExpenses - transferToSavings) * 100) / 100,
      monthlyIncome: Math.round(monthlyIncome * 100) / 100,
      monthlyExpenses: Math.round(monthlyExpenses * 100) / 100,
      totalSaved: Math.round(totalSaved * 100) / 100,
    };
  }

  private async invalidateCache(userId: string) {
    try {
      await redis.del(`dashboard:${userId}`);
    } catch {
      // Redis unavailable
    }
  }
}

export const accountService = new AccountService();
