import { api } from './api';
import type { ApiResponse } from '@/types/auth';
import type {
  RecurringTransaction,
  CreateRecurringData,
  UpdateRecurringData,
} from '@/types/transaction';

export async function getRecurring(): Promise<RecurringTransaction[]> {
  const response = await api.get<ApiResponse<RecurringTransaction[]>>('/recurring');
  return response.data;
}

export async function createRecurring(data: CreateRecurringData): Promise<RecurringTransaction> {
  const response = await api.post<ApiResponse<RecurringTransaction>>('/recurring', data);
  return response.data;
}

export async function updateRecurring(
  id: string,
  data: UpdateRecurringData,
): Promise<RecurringTransaction> {
  const response = await api.put<ApiResponse<RecurringTransaction>>(`/recurring/${id}`, data);
  return response.data;
}

export async function toggleRecurring(id: string): Promise<RecurringTransaction> {
  const response = await api.patch<ApiResponse<RecurringTransaction>>(`/recurring/${id}/toggle`);
  return response.data;
}

export async function deleteRecurring(id: string): Promise<void> {
  await api.delete<ApiResponse<null>>(`/recurring/${id}`);
}
