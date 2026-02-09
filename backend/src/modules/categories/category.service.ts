import { redis } from '../../lib/redis';
import { NotFoundError, ForbiddenError, ValidationError } from '../../lib/errors';
import { categoryRepository } from './category.repository';
import type { CategoryType } from '@prisma/client';

interface CreateCategoryDTO {
  name: string;
  icon: string;
  color: string;
  type: 'EXPENSE' | 'INCOME';
  keywords?: string[];
}

interface UpdateCategoryDTO {
  name?: string;
  icon?: string;
  color?: string;
  keywords?: string[];
}

class CategoryService {
  async create(userId: string, data: CreateCategoryDTO) {
    const existing = await categoryRepository.findByUserIdAndName(userId, data.name);
    if (existing) {
      throw new ValidationError('Ya existe una categoria con ese nombre');
    }

    const category = await categoryRepository.create({
      userId,
      name: data.name,
      icon: data.icon,
      color: data.color,
      type: data.type as CategoryType,
      keywords: data.keywords,
    });

    await this.invalidateCache(userId);
    return category;
  }

  async update(userId: string, id: string, data: UpdateCategoryDTO) {
    const category = await categoryRepository.findById(id);
    if (!category) throw new NotFoundError('Categoria no encontrada');
    if (category.userId !== userId) throw new ForbiddenError('Acceso denegado');

    if (data.name && data.name !== category.name) {
      const existing = await categoryRepository.findByUserIdAndName(userId, data.name);
      if (existing) {
        throw new ValidationError('Ya existe una categoria con ese nombre');
      }
    }

    const updated = await categoryRepository.update(id, data);
    await this.invalidateCache(userId);
    return updated;
  }

  async delete(userId: string, id: string) {
    const category = await categoryRepository.findById(id);
    if (!category) throw new NotFoundError('Categoria no encontrada');
    if (category.userId !== userId) throw new ForbiddenError('Acceso denegado');

    if (category.isDefault) {
      throw new ValidationError('No se pueden eliminar categorias por defecto');
    }

    const hasTransactions = await categoryRepository.hasTransactions(id);
    if (hasTransactions) {
      throw new ValidationError('No se puede eliminar una categoria con transacciones asociadas');
    }

    await categoryRepository.delete(id);
    await this.invalidateCache(userId);
  }

  private async invalidateCache(userId: string) {
    try {
      await redis.del(`dashboard:${userId}`);
    } catch {
      // Redis unavailable
    }
  }
}

export const categoryService = new CategoryService();
