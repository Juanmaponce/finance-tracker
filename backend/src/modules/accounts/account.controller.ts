import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { accountService } from './account.service';

const createSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  currency: z.string().length(3, 'La moneda debe tener 3 caracteres'),
  icon: z.string().max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color debe ser formato hex')
    .optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  icon: z.string().max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  sortOrder: z.number().int().min(0).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid('ID de cuenta invalido'),
});

const reorderSchema = z.object({
  accountIds: z.array(z.string().uuid()),
});

export async function listAccounts(req: Request, res: Response, next: NextFunction) {
  try {
    const accounts = await accountService.list(req.user!.userId);
    res.json({ success: true, data: accounts });
  } catch (error) {
    next(error);
  }
}

export async function getAccountBalances(req: Request, res: Response, next: NextFunction) {
  try {
    const balances = await accountService.getAllBalances(req.user!.userId);
    res.json({ success: true, data: balances });
  } catch (error) {
    next(error);
  }
}

export async function createAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = createSchema.parse(req.body);
    const account = await accountService.create(req.user!.userId, validated);
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
}

export async function updateAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    const validated = updateSchema.parse(req.body);
    const account = await accountService.update(req.user!.userId, id, validated);
    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idParamSchema.parse(req.params);
    await accountService.delete(req.user!.userId, id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function reorderAccounts(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountIds } = reorderSchema.parse(req.body);
    await accountService.reorder(req.user!.userId, accountIds);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
