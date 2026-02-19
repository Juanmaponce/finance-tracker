import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors';
import { redis } from '../../lib/redis';
import { savingsRepository } from './savings.repository';
import { categoryRepository } from '../categories/category.repository';
import { accountService } from '../accounts/account.service';
import { accountRepository } from '../accounts/account.repository';

interface CreateSavingsDTO {
  name: string;
  targetAmount: number;
  currency: string;
  deadline?: string;
  deductFromBalance?: boolean;
  defaultAccountId?: string;
}

interface UpdateSavingsDTO {
  name?: string;
  targetAmount?: number;
  deadline?: string | null;
  deductFromBalance?: boolean;
  defaultAccountId?: string | null;
}

interface DepositDTO {
  amount: number;
  note?: string;
  accountId?: string;
}

const SAVINGS_CATEGORY_NAME = 'Ahorros';
const SAVINGS_CATEGORY_ICON = 'piggy-bank';
const SAVINGS_CATEGORY_COLOR = '#10B981';

class SavingsService {
  async list(userId: string) {
    const goals = await savingsRepository.findByUserId(userId);
    return goals.map((g) => this.formatGoal(g));
  }

  async create(userId: string, data: CreateSavingsDTO) {
    if (data.defaultAccountId) {
      await this.validateAccountForGoal(userId, data.defaultAccountId, data.currency);
    }

    const goal = await savingsRepository.create({
      userId,
      name: data.name,
      targetAmount: data.targetAmount,
      currency: data.currency,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
      deductFromBalance: data.deductFromBalance,
      defaultAccountId: data.defaultAccountId,
    });
    return this.formatGoal(goal);
  }

  async update(userId: string, id: string, data: UpdateSavingsDTO) {
    const existing = await savingsRepository.findById(id);
    if (!existing) throw new NotFoundError('Meta de ahorro no encontrada');
    if (existing.userId !== userId) throw new ForbiddenError('Acceso denegado');

    if (data.defaultAccountId) {
      await this.validateAccountForGoal(userId, data.defaultAccountId, existing.currency);
    }

    const goal = await savingsRepository.update(id, {
      ...(data.name && { name: data.name }),
      ...(data.targetAmount !== undefined && { targetAmount: data.targetAmount }),
      ...(data.deadline !== undefined && {
        deadline: data.deadline ? new Date(data.deadline) : null,
      }),
      ...(data.deductFromBalance !== undefined && { deductFromBalance: data.deductFromBalance }),
      ...(data.defaultAccountId !== undefined && { defaultAccountId: data.defaultAccountId }),
    });
    return this.formatGoal(goal);
  }

  async deposit(userId: string, id: string, data: DepositDTO) {
    const existing = await savingsRepository.findById(id);
    if (!existing) throw new NotFoundError('Meta de ahorro no encontrada');
    if (existing.userId !== userId) throw new ForbiddenError('Acceso denegado');

    const currentAmount = Number(existing.currentAmount);
    const targetAmount = Number(existing.targetAmount);

    if (currentAmount + data.amount > targetAmount) {
      throw new ValidationError(
        `El deposito excede la meta. Maximo disponible: ${(targetAmount - currentAmount).toFixed(2)}`,
      );
    }

    // Determine the account to deduct from
    const resolvedAccountId = data.accountId || existing.defaultAccountId || undefined;

    // Build transaction data only when deposit affects balance
    let transactionData;
    if (existing.deductFromBalance) {
      let accountId: string | undefined = resolvedAccountId;

      if (accountId) {
        // Validate selected account
        await this.validateAccountForGoal(userId, accountId, existing.currency);
        await this.validateAccountBalance(userId, accountId, data.amount);
      } else {
        // Fall back to default account
        const defaultAccount = await accountService.getDefaultAccount(userId);
        accountId = defaultAccount?.id;
      }

      const categoryId = await this.getOrCreateSavingsCategory(userId);
      transactionData = {
        userId,
        accountId,
        amount: data.amount,
        currency: existing.currency,
        categoryId,
        description: `Ahorro: ${existing.name}`,
      };
    }

    const goal = await savingsRepository.deposit(
      id,
      data.amount,
      {
        savingsGoalId: id,
        amount: data.amount,
        currency: existing.currency,
        note: data.note,
        accountId: resolvedAccountId || transactionData?.accountId,
      },
      transactionData,
    );

    // Invalidate dashboard cache when a transaction was created
    if (transactionData) {
      try {
        await redis.del(`dashboard:${userId}`);
      } catch {
        // Redis unavailable
      }
    }

    return this.formatGoal(goal);
  }

  async getDeposits(userId: string, id: string) {
    const existing = await savingsRepository.findById(id);
    if (!existing) throw new NotFoundError('Meta de ahorro no encontrada');
    if (existing.userId !== userId) throw new ForbiddenError('Acceso denegado');

    const deposits = await savingsRepository.findDepositsByGoalId(id);
    return deposits.map((d) => ({
      id: d.id,
      amount: Number(d.amount),
      currency: d.currency,
      note: d.note,
      date: d.date,
      createdAt: d.createdAt,
      account: d.account || null,
    }));
  }

  async getAvailableAccounts(userId: string, id: string) {
    const existing = await savingsRepository.findById(id);
    if (!existing) throw new NotFoundError('Meta de ahorro no encontrada');
    if (existing.userId !== userId) throw new ForbiddenError('Acceso denegado');

    const accounts = await accountRepository.findByUserId(userId);
    const matchingAccounts = accounts.filter((a) => a.currency === existing.currency);

    const result = await Promise.all(
      matchingAccounts.map(async (account) => {
        const balance = await accountService.getAvailableBalance(account.id);
        return {
          id: account.id,
          name: account.name,
          currency: account.currency,
          icon: account.icon,
          color: account.color,
          isDefault: account.isDefault,
          availableBalance: balance,
        };
      }),
    );

    return result;
  }

  async getDeductedSavingsTotal(userId: string) {
    return savingsRepository.getDeductedSavingsTotal(userId);
  }

  async delete(userId: string, id: string) {
    const existing = await savingsRepository.findById(id);
    if (!existing) throw new NotFoundError('Meta de ahorro no encontrada');
    if (existing.userId !== userId) throw new ForbiddenError('Acceso denegado');

    await savingsRepository.delete(id);
  }

  private async validateAccountForGoal(userId: string, accountId: string, currency: string) {
    const account = await accountRepository.findById(accountId);
    if (!account) throw new NotFoundError('Cuenta no encontrada');
    if (account.userId !== userId) throw new ForbiddenError('Acceso denegado');
    if (account.currency !== currency) {
      throw new ValidationError(
        `La cuenta debe ser en ${currency}. La cuenta seleccionada es en ${account.currency}`,
      );
    }
  }

  private async validateAccountBalance(userId: string, accountId: string, amount: number) {
    const balance = await accountService.getAvailableBalance(accountId);
    if (balance < amount) {
      throw new ValidationError(`Balance insuficiente. Disponible: ${balance.toFixed(2)}`);
    }
  }

  private async getOrCreateSavingsCategory(userId: string): Promise<string> {
    const existing = await categoryRepository.findByUserIdAndName(userId, SAVINGS_CATEGORY_NAME);
    if (existing) return existing.id;

    const created = await categoryRepository.create({
      userId,
      name: SAVINGS_CATEGORY_NAME,
      icon: SAVINGS_CATEGORY_ICON,
      color: SAVINGS_CATEGORY_COLOR,
      type: 'EXPENSE',
      keywords: ['ahorro', 'savings', 'meta'],
    });
    return created.id;
  }

  private formatGoal(g: {
    id: string;
    name: string;
    targetAmount: unknown;
    currentAmount: unknown;
    currency: string;
    deadline: Date | null;
    deductFromBalance: boolean;
    defaultAccountId: string | null;
    defaultAccount?: {
      id: string;
      name: string;
      currency: string;
      icon: string | null;
      color: string;
    } | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const target = Number(g.targetAmount);
    const current = Number(g.currentAmount);
    return {
      id: g.id,
      name: g.name,
      targetAmount: target,
      currentAmount: current,
      progress: target > 0 ? Math.round((current / target) * 10000) / 100 : 0,
      currency: g.currency,
      deadline: g.deadline,
      deductFromBalance: g.deductFromBalance,
      defaultAccountId: g.defaultAccountId,
      defaultAccount: g.defaultAccount || null,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    };
  }
}

export const savingsService = new SavingsService();
