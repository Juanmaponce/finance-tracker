import type { TransactionType } from '@prisma/client';

export interface CreateTransactionDTO {
  amount: number;
  currency: string;
  categoryId?: string;
  type: TransactionType;
  description?: string;
  date: string;
}

export interface UpdateTransactionDTO {
  amount?: number;
  currency?: string;
  categoryId?: string;
  type?: TransactionType;
  description?: string;
  date?: string;
}

export interface TransactionFilters {
  userId: string;
  page: number;
  limit: number;
  type?: TransactionType;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
}

export interface TransactionResponse {
  id: string;
  amount: number;
  currency: string;
  type: TransactionType;
  description: string | null;
  date: Date;
  receiptUrl: string | null;
  isRecurring: boolean;
  createdAt: Date;
  category: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
}

export interface CategoryStats {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  total: number;
}

export interface DashboardStats {
  totalExpenses: number;
  totalIncome: number;
  balance: number;
  expensesByCategory: CategoryStats[];
  recentTransactions: TransactionResponse[];
}
