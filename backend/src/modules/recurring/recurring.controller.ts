import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { recurringService } from './recurring.service';

const createSchema = z.object({
  amount: z.number().positive('El monto debe ser mayor a cero').max(999999999),
  currency: z.string().length(3),
  categoryId: z.string().uuid(),
  description: z.string().max(500).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  nextExecution: z.string().datetime(),
});

const updateSchema = z.object({
  amount: z.number().positive().max(999999999).optional(),
  currency: z.string().length(3).optional(),
  categoryId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']).optional(),
  nextExecution: z.string().datetime().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

export async function listRecurring(req: Request, res: Response, next: NextFunction) {
  try {
    const recurring = await recurringService.list(req.user!.userId);
    res.json({ success: true, data: recurring });
  } catch (error) {
    next(error);
  }
}

export async function createRecurring(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createSchema.parse(req.body);
    const recurring = await recurringService.create(req.user!.userId, data);
    res.status(201).json({ success: true, data: recurring });
  } catch (error) {
    next(error);
  }
}

export async function updateRecurring(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const data = updateSchema.parse(req.body);
    const recurring = await recurringService.update(req.user!.userId, id, data);
    res.json({ success: true, data: recurring });
  } catch (error) {
    next(error);
  }
}

export async function toggleRecurring(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const recurring = await recurringService.toggle(req.user!.userId, id);
    res.json({ success: true, data: recurring });
  } catch (error) {
    next(error);
  }
}

export async function deleteRecurring(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    await recurringService.delete(req.user!.userId, id);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
}
