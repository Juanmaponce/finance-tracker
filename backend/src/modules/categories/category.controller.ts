import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { categoryRepository } from './category.repository';
import { categoryService } from './category.service';

const listQuerySchema = z.object({
  type: z.enum(['EXPENSE', 'INCOME']).optional(),
});

const createCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(50, 'Maximo 50 caracteres'),
  icon: z.string().min(1, 'El icono es requerido'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color debe ser hexadecimal (#RRGGBB)'),
  type: z.enum(['EXPENSE', 'INCOME'], { message: 'El tipo es requerido' }),
  keywords: z.array(z.string()).optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  icon: z.string().min(1).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  keywords: z.array(z.string()).optional(),
});

export async function listCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const { type } = listQuerySchema.parse(req.query);
    const categories = await categoryRepository.findByUserId(req.user!.userId, type);

    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createCategorySchema.parse(req.body);
    const category = await categoryService.create(req.user!.userId, data);

    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    const data = updateCategorySchema.parse(req.body);
    const category = await categoryService.update(req.user!.userId, req.params.id, data);

    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
) {
  try {
    await categoryService.delete(req.user!.userId, req.params.id);

    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
}
