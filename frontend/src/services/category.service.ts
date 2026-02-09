import { api } from './api';
import type { ApiResponse } from '@/types/auth';
import type { Category, CreateCategoryData, UpdateCategoryData } from '@/types/transaction';

export async function getCategories(type?: 'EXPENSE' | 'INCOME'): Promise<Category[]> {
  const query = type ? `?type=${type}` : '';
  const response = await api.get<ApiResponse<Category[]>>(`/categories${query}`);
  return response.data;
}

export async function createCategory(data: CreateCategoryData): Promise<Category> {
  const response = await api.post<ApiResponse<Category>>('/categories', data);
  return response.data;
}

export async function updateCategory(id: string, data: UpdateCategoryData): Promise<Category> {
  const response = await api.put<ApiResponse<Category>>(`/categories/${id}`, data);
  return response.data;
}

export async function deleteCategory(id: string): Promise<void> {
  await api.delete<ApiResponse<null>>(`/categories/${id}`);
}
