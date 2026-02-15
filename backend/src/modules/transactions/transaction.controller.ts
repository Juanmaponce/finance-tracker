import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { transactionService } from './transaction.service';

const createSchema = z.object({
  amount: z.number().positive('Amount must be greater than zero').max(999999999),
  currency: z.string().length(3, 'Currency must be a 3-letter code'),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  type: z.enum(['EXPENSE', 'INCOME']),
  description: z.string().max(500).optional(),
  date: z.string().datetime({ message: 'Invalid date format' }),
});

const updateSchema = z.object({
  amount: z.number().positive('Amount must be greater than zero').max(999999999).optional(),
  currency: z.string().length(3).optional(),
  categoryId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  type: z.enum(['EXPENSE', 'INCOME']).optional(),
  description: z.string().max(500).optional(),
  date: z.string().datetime().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(['EXPENSE', 'INCOME']).optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid('Invalid transaction ID'),
});

export async function createTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = createSchema.parse(req.body);
    const transaction = await transactionService.create(req.user!.userId, validated);

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
}

export async function getTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const transaction = await transactionService.getById(req.user!.userId, id);

    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
}

export async function listTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const filters = listQuerySchema.parse(req.query);
    const result = await transactionService.list(req.user!.userId, filters);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function updateTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const validated = updateSchema.parse(req.body);
    const transaction = await transactionService.update(req.user!.userId, id, validated);

    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
}

export async function deleteTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    await transactionService.delete(req.user!.userId, id);

    res.json({ success: true, data: { message: 'Transaction deleted' } });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await transactionService.getDashboardStats(req.user!.userId);

    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}
