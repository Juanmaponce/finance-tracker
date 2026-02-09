import jwt from 'jsonwebtoken';
import { config } from '../../config/env';

export function generateTestToken(
  userId: string = 'test-user-id',
  email: string = 'test@example.com',
): string {
  return jwt.sign({ userId, email }, config.jwt.secret, { expiresIn: '15m' });
}

export const testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  primaryCurrency: 'USD',
  darkMode: false,
  locale: 'es',
  createdAt: new Date('2026-01-01'),
};

export const testCategory = {
  id: 'cat-food-id',
  name: 'Comida',
  icon: 'utensils',
  color: '#FF6B6B',
  type: 'EXPENSE' as const,
  keywords: ['restaurante', 'comida', 'almuerzo', 'cena'],
  userId: 'test-user-id',
  isDefault: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

export const testTransaction = {
  id: 'tx-1',
  userId: 'test-user-id',
  amount: 50.0,
  currency: 'USD',
  type: 'EXPENSE' as const,
  description: 'Lunch',
  date: new Date('2026-02-01'),
  categoryId: 'cat-food-id',
  receiptUrl: null,
  isRecurring: false,
  recurringId: null,
  deletedAt: null,
  createdAt: new Date('2026-02-01'),
  updatedAt: new Date('2026-02-01'),
  category: {
    id: 'cat-food-id',
    name: 'Comida',
    icon: 'utensils',
    color: '#FF6B6B',
  },
};
