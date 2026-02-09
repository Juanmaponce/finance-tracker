import { api } from './api';
import type { ApiResponse, User } from '@/types/auth';

export interface UpdateSettingsData {
  primaryCurrency?: string;
  darkMode?: boolean;
  locale?: string;
  displayName?: string;
}

export async function updateSettings(data: UpdateSettingsData): Promise<User> {
  const response = await api.put<ApiResponse<User>>('/users/settings', data);
  return response.data;
}

export async function exportData(): Promise<Blob> {
  const response = await api.get<ApiResponse<unknown>>('/users/export');
  return new Blob([JSON.stringify(response.data, null, 2)], {
    type: 'application/json',
  });
}
