import { categoryService } from '../category.service';
import { categoryRepository } from '../category.repository';
import { redis } from '../../../lib/redis';
import { NotFoundError, ForbiddenError, ValidationError } from '../../../lib/errors';

jest.mock('../category.repository', () => ({
  categoryRepository: {
    findByUserIdAndName: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    hasTransactions: jest.fn(),
  },
}));

const mockedRepo = categoryRepository as jest.Mocked<typeof categoryRepository>;

describe('CategoryService', () => {
  const userId = 'user-123';
  const categoryId = 'cat-1';

  beforeEach(() => jest.clearAllMocks());

  describe('create', () => {
    const createData = {
      name: 'Food',
      icon: '🍔',
      color: '#FF0000',
      type: 'EXPENSE' as const,
      keywords: ['food', 'restaurant'],
    };

    it('should create a category successfully', async () => {
      mockedRepo.findByUserIdAndName.mockResolvedValue(null);
      mockedRepo.create.mockResolvedValue({ id: categoryId, ...createData } as never);

      const result = await categoryService.create(userId, createData);

      expect(mockedRepo.findByUserIdAndName).toHaveBeenCalledWith(userId, 'Food');
      expect(mockedRepo.create).toHaveBeenCalledWith({
        userId,
        name: 'Food',
        icon: '🍔',
        color: '#FF0000',
        type: 'EXPENSE',
        keywords: ['food', 'restaurant'],
      });
      expect(result).toEqual({ id: categoryId, ...createData });
    });

    it('should throw ValidationError if name already exists', async () => {
      mockedRepo.findByUserIdAndName.mockResolvedValue({ id: 'existing' } as never);

      await expect(categoryService.create(userId, createData)).rejects.toThrow(ValidationError);
    });

    it('should invalidate dashboard cache after creation', async () => {
      mockedRepo.findByUserIdAndName.mockResolvedValue(null);
      mockedRepo.create.mockResolvedValue({ id: categoryId } as never);

      await categoryService.create(userId, createData);

      expect(redis.del).toHaveBeenCalledWith(`dashboard:${userId}`);
    });
  });

  describe('update', () => {
    const existingCategory = { id: categoryId, userId, name: 'Food', isDefault: false };

    it('should update a category successfully', async () => {
      mockedRepo.findById.mockResolvedValue(existingCategory as never);
      mockedRepo.update.mockResolvedValue({ ...existingCategory, name: 'Meals' } as never);

      const result = await categoryService.update(userId, categoryId, { name: 'Meals' });

      expect(mockedRepo.update).toHaveBeenCalledWith(categoryId, { name: 'Meals' });
      expect(result).toEqual({ ...existingCategory, name: 'Meals' });
    });

    it('should throw NotFoundError if category does not exist', async () => {
      mockedRepo.findById.mockResolvedValue(null);

      await expect(categoryService.update(userId, categoryId, { name: 'X' })).rejects.toThrow(
        NotFoundError,
      );
    });

    it('should throw ForbiddenError if user does not own the category', async () => {
      mockedRepo.findById.mockResolvedValue({ ...existingCategory, userId: 'other' } as never);

      await expect(categoryService.update(userId, categoryId, { name: 'X' })).rejects.toThrow(
        ForbiddenError,
      );
    });

    it('should throw ValidationError if new name already exists', async () => {
      mockedRepo.findById.mockResolvedValue(existingCategory as never);
      mockedRepo.findByUserIdAndName.mockResolvedValue({ id: 'other-cat' } as never);

      await expect(
        categoryService.update(userId, categoryId, { name: 'Existing' }),
      ).rejects.toThrow(ValidationError);
    });

    it('should skip duplicate name check when name unchanged', async () => {
      mockedRepo.findById.mockResolvedValue(existingCategory as never);
      mockedRepo.update.mockResolvedValue(existingCategory as never);

      await categoryService.update(userId, categoryId, { name: 'Food' });

      expect(mockedRepo.findByUserIdAndName).not.toHaveBeenCalled();
    });

    it('should invalidate cache after update', async () => {
      mockedRepo.findById.mockResolvedValue(existingCategory as never);
      mockedRepo.update.mockResolvedValue({ ...existingCategory, icon: '🍕' } as never);

      await categoryService.update(userId, categoryId, { icon: '🍕' });

      expect(redis.del).toHaveBeenCalledWith(`dashboard:${userId}`);
    });

    it('should skip duplicate check when updating non-name fields', async () => {
      mockedRepo.findById.mockResolvedValue(existingCategory as never);
      mockedRepo.update.mockResolvedValue({ ...existingCategory, color: '#00FF00' } as never);

      await categoryService.update(userId, categoryId, { color: '#00FF00' });

      expect(mockedRepo.findByUserIdAndName).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    const existingCategory = { id: categoryId, userId, name: 'Food', isDefault: false };

    it('should delete a category successfully', async () => {
      mockedRepo.findById.mockResolvedValue(existingCategory as never);
      mockedRepo.hasTransactions.mockResolvedValue(false);

      await categoryService.delete(userId, categoryId);

      expect(mockedRepo.delete).toHaveBeenCalledWith(categoryId);
      expect(redis.del).toHaveBeenCalledWith(`dashboard:${userId}`);
    });

    it('should throw NotFoundError if category does not exist', async () => {
      mockedRepo.findById.mockResolvedValue(null);

      await expect(categoryService.delete(userId, categoryId)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user does not own the category', async () => {
      mockedRepo.findById.mockResolvedValue({ ...existingCategory, userId: 'other' } as never);

      await expect(categoryService.delete(userId, categoryId)).rejects.toThrow(ForbiddenError);
    });

    it('should throw ValidationError if category is default', async () => {
      mockedRepo.findById.mockResolvedValue({ ...existingCategory, isDefault: true } as never);

      await expect(categoryService.delete(userId, categoryId)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if category has transactions', async () => {
      mockedRepo.findById.mockResolvedValue(existingCategory as never);
      mockedRepo.hasTransactions.mockResolvedValue(true);

      await expect(categoryService.delete(userId, categoryId)).rejects.toThrow(ValidationError);
    });
  });
});
