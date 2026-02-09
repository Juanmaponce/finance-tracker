import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors';
import { savingsRepository } from './savings.repository';

interface CreateSavingsDTO {
  name: string;
  targetAmount: number;
  currency: string;
  deadline?: string;
}

interface UpdateSavingsDTO {
  name?: string;
  targetAmount?: number;
  deadline?: string | null;
}

class SavingsService {
  async list(userId: string) {
    const goals = await savingsRepository.findByUserId(userId);
    return goals.map((g) => this.formatGoal(g));
  }

  async create(userId: string, data: CreateSavingsDTO) {
    const goal = await savingsRepository.create({
      userId,
      name: data.name,
      targetAmount: data.targetAmount,
      currency: data.currency,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
    });
    return this.formatGoal(goal);
  }

  async update(userId: string, id: string, data: UpdateSavingsDTO) {
    const existing = await savingsRepository.findById(id);
    if (!existing) throw new NotFoundError('Meta de ahorro no encontrada');
    if (existing.userId !== userId) throw new ForbiddenError('Acceso denegado');

    const goal = await savingsRepository.update(id, {
      ...(data.name && { name: data.name }),
      ...(data.targetAmount !== undefined && { targetAmount: data.targetAmount }),
      ...(data.deadline !== undefined && {
        deadline: data.deadline ? new Date(data.deadline) : null,
      }),
    });
    return this.formatGoal(goal);
  }

  async deposit(userId: string, id: string, amount: number) {
    const existing = await savingsRepository.findById(id);
    if (!existing) throw new NotFoundError('Meta de ahorro no encontrada');
    if (existing.userId !== userId) throw new ForbiddenError('Acceso denegado');

    const currentAmount = Number(existing.currentAmount);
    const targetAmount = Number(existing.targetAmount);

    if (currentAmount + amount > targetAmount) {
      throw new ValidationError(
        `El deposito excede la meta. Maximo disponible: ${(targetAmount - currentAmount).toFixed(2)}`,
      );
    }

    const goal = await savingsRepository.deposit(id, amount);
    return this.formatGoal(goal);
  }

  async delete(userId: string, id: string) {
    const existing = await savingsRepository.findById(id);
    if (!existing) throw new NotFoundError('Meta de ahorro no encontrada');
    if (existing.userId !== userId) throw new ForbiddenError('Acceso denegado');

    await savingsRepository.delete(id);
  }

  private formatGoal(g: {
    id: string;
    name: string;
    targetAmount: unknown;
    currentAmount: unknown;
    currency: string;
    deadline: Date | null;
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
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    };
  }
}

export const savingsService = new SavingsService();
