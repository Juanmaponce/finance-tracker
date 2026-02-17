import { api } from './api';
import type { ApiResponse } from '@/types/auth';
import type {
  DashboardStats,
  PaginatedTransactions,
  Transaction,
  CreateTransactionData,
  UpdateTransactionData,
  TransactionFilters,
} from '@/types/transaction';

export async function getDashboardStats(accountId?: string): Promise<DashboardStats> {
  const params = accountId ? `?accountId=${accountId}` : '';
  const response = await api.get<ApiResponse<DashboardStats>>(`/transactions/dashboard${params}`);
  return response.data;
}

export async function getTransactions(
  filters: TransactionFilters = {},
): Promise<PaginatedTransactions> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.type) params.set('type', filters.type);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);

  const query = params.toString();
  const response = await api.get<ApiResponse<PaginatedTransactions>>(
    `/transactions${query ? `?${query}` : ''}`,
  );
  return response.data;
}

export async function createTransaction(data: CreateTransactionData): Promise<Transaction> {
  const response = await api.post<ApiResponse<Transaction>>('/transactions', data);
  return response.data;
}

export async function updateTransaction(
  id: string,
  data: UpdateTransactionData,
): Promise<Transaction> {
  const response = await api.put<ApiResponse<Transaction>>(`/transactions/${id}`, data);
  return response.data;
}

export async function deleteTransaction(id: string): Promise<void> {
  await api.delete<ApiResponse<{ message: string }>>(`/transactions/${id}`);
}
