import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { savingsService } from './savings.service';

const createSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  targetAmount: z.number().positive('La meta debe ser mayor a cero').max(999999999),
  currency: z.string().length(3),
  deadline: z.string().datetime().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  targetAmount: z.number().positive().max(999999999).optional(),
  deadline: z.string().datetime().nullable().optional(),
});

const depositSchema = z.object({
  amount: z.number().positive('El monto debe ser mayor a cero').max(999999999),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

export async function listSavings(req: Request, res: Response, next: NextFunction) {
  try {
    const goals = await savingsService.list(req.user!.userId);
    res.json({ success: true, data: goals });
  } catch (error) {
    next(error);
  }
}

export async function createSavings(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body);
    const goal = await savingsService.create(req.user!.userId, data);
    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
}

export async function updateSavings(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = updateSchema.parse(req.body);
    const goal = await savingsService.update(req.user!.userId, id, data);
    res.json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
}

export async function depositToSavings(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const { amount } = depositSchema.parse(req.body);
    const goal = await savingsService.deposit(req.user!.userId, id, amount);
    res.json({ success: true, data: goal });
  } catch (error) {
    next(error);
  }
}

export async function deleteSavings(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    await savingsService.delete(req.user!.userId, id);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
}
