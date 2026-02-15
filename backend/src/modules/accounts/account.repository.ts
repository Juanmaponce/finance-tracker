import { prisma } from '../../lib/prisma';

class AccountRepository {
  async findByUserId(userId: string) {
    return prisma.account.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.account.findFirst({ where: { id } });
  }

  async findDefault(userId: string) {
    return prisma.account.findFirst({
      where: { userId, isDefault: true },
    });
  }

  async create(data: {
    userId: string;
    name: string;
    currency: string;
    icon?: string;
    color: string;
    sortOrder: number;
  }) {
    return prisma.account.create({ data });
  }

  async update(
    id: string,
    data: { name?: string; icon?: string; color?: string; sortOrder?: number },
  ) {
    return prisma.account.update({ where: { id }, data });
  }

  async delete(id: string) {
    return prisma.account.delete({ where: { id } });
  }

  async getMaxSortOrder(userId: string): Promise<number> {
    const result = await prisma.account.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });
    return result._max.sortOrder ?? -1;
  }

  async countTransactions(accountId: string): Promise<number> {
    return prisma.transaction.count({
      where: { accountId, deletedAt: null },
    });
  }

  async findDuplicate(userId: string, name: string, excludeId?: string) {
    return prisma.account.findFirst({
      where: {
        userId,
        name,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
  }

  async reorder(userId: string, accountIds: string[]) {
    return prisma.$transaction(
      accountIds.map((id, index) =>
        prisma.account.updateMany({
          where: { id, userId },
          data: { sortOrder: index },
        }),
      ),
    );
  }

  async getTransactionStatsByAccount(accountId: string) {
    return prisma.transaction.groupBy({
      by: ['type'],
      where: { accountId, deletedAt: null },
      _sum: { amount: true },
    });
  }

  async getMonthlyTransactionStatsByAccount(accountId: string, startOfMonth: Date) {
    return prisma.transaction.groupBy({
      by: ['type'],
      where: {
        accountId,
        deletedAt: null,
        date: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });
  }
}

export const accountRepository = new AccountRepository();
