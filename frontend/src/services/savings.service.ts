import { api } from './api';
import type { ApiResponse } from '@/types/auth';
import type { SavingsGoal, CreateSavingsData, UpdateSavingsData } from '@/types/transaction';

export async function getSavings(): Promise<SavingsGoal[]> {
  const response = await api.get<ApiResponse<SavingsGoal[]>>('/savings');
  return response.data;
}

export async function createSavings(data: CreateSavingsData): Promise<SavingsGoal> {
  const response = await api.post<ApiResponse<SavingsGoal>>('/savings', data);
  return response.data;
}

export async function updateSavings(id: string, data: UpdateSavingsData): Promise<SavingsGoal> {
  const response = await api.put<ApiResponse<SavingsGoal>>(`/savings/${id}`, data);
  return response.data;
}

export async function depositToSavings(id: string, amount: number): Promise<SavingsGoal> {
  const response = await api.post<ApiResponse<SavingsGoal>>(`/savings/${id}/deposit`, { amount });
  return response.data;
}

export async function deleteSavings(id: string): Promise<void> {
  await api.delete<ApiResponse<null>>(`/savings/${id}`);
}
