import { prisma } from '../../lib/prisma';

interface CreateSavingsData {
  userId: string;
  name: string;
  targetAmount: number;
  currency: string;
  deadline?: Date;
  deductFromBalance?: boolean;
  defaultAccountId?: string;
}

interface UpdateSavingsData {
  name?: string;
  targetAmount?: number;
  deadline?: Date | null;
  deductFromBalance?: boolean;
  defaultAccountId?: string | null;
}

interface CreateDepositData {
  savingsGoalId: string;
  amount: number;
  currency: string;
  note?: string;
  accountId?: string;
}

interface DepositTransactionData {
  userId: string;
  accountId?: string;
  amount: number;
  currency: string;
  categoryId: string;
  description: string;
}

const accountSelect = {
  id: true,
  name: true,
  currency: true,
  icon: true,
  color: true,
} as const;

class SavingsRepository {
  async findByUserId(userId: string) {
    return prisma.savingsGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { defaultAccount: { select: accountSelect } },
    });
  }

  async findById(id: string) {
    return prisma.savingsGoal.findUnique({
      where: { id },
      include: { defaultAccount: { select: accountSelect } },
    });
  }

  async create(data: CreateSavingsData) {
    return prisma.savingsGoal.create({
      data: {
        userId: data.userId,
        name: data.name,
        targetAmount: data.targetAmount,
        currentAmount: 0,
        currency: data.currency,
        deadline: data.deadline,
        deductFromBalance: data.deductFromBalance ?? true,
        defaultAccountId: data.defaultAccountId,
      },
      include: { defaultAccount: { select: accountSelect } },
    });
  }

  async update(id: string, data: UpdateSavingsData) {
    return prisma.savingsGoal.update({
      where: { id },
      data,
      include: { defaultAccount: { select: accountSelect } },
    });
  }

  async deposit(
    id: string,
    amount: number,
    depositData: CreateDepositData,
    transactionData?: DepositTransactionData,
  ) {
    return prisma.$transaction(async (tx) => {
      const goal = await tx.savingsGoal.update({
        where: { id },
        data: {
          currentAmount: { increment: amount },
        },
      });

      await tx.savingsDeposit.create({
        data: {
          savingsGoalId: depositData.savingsGoalId,
          amount: depositData.amount,
          currency: depositData.currency,
          note: depositData.note,
          accountId: depositData.accountId,
        },
      });

      // Create a TRANSFER_TO_SAVINGS transaction for the history
      if (transactionData) {
        await tx.transaction.create({
          data: {
            userId: transactionData.userId,
            accountId: transactionData.accountId,
            amount: transactionData.amount,
            currency: transactionData.currency,
            categoryId: transactionData.categoryId,
            type: 'TRANSFER_TO_SAVINGS',
            description: transactionData.description,
            date: new Date(),
          },
        });
      }

      return goal;
    });
  }

  async findDepositsByGoalId(savingsGoalId: string) {
    return prisma.savingsDeposit.findMany({
      where: { savingsGoalId },
      orderBy: { date: 'desc' },
      include: { account: { select: accountSelect } },
    });
  }

  async getDeductedSavingsTotal(userId: string) {
    const result = await prisma.savingsGoal.aggregate({
      where: { userId, deductFromBalance: true },
      _sum: { currentAmount: true },
    });
    return Number(result._sum.currentAmount ?? 0);
  }

  async delete(id: string) {
    return prisma.savingsGoal.delete({ where: { id } });
  }
}

export const savingsRepository = new SavingsRepository();
