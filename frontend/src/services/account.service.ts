import { api } from './api';
import type { ApiResponse } from '@/types/auth';
import type { Account, AccountBalance, CreateAccountData } from '@/types/transaction';

export async function getAccounts(): Promise<Account[]> {
  const response = await api.get<ApiResponse<Account[]>>('/accounts');
  return response.data;
}

export async function getAccountBalances(): Promise<AccountBalance[]> {
  const response = await api.get<ApiResponse<AccountBalance[]>>('/accounts/balances');
  return response.data;
}

export async function createAccount(data: CreateAccountData): Promise<Account> {
  const response = await api.post<ApiResponse<Account>>('/accounts', data);
  return response.data;
}

export async function updateAccount(
  id: string,
  data: Partial<CreateAccountData>,
): Promise<Account> {
  const response = await api.put<ApiResponse<Account>>(`/accounts/${id}`, data);
  return response.data;
}

export async function deleteAccount(id: string): Promise<void> {
  await api.delete<ApiResponse<null>>(`/accounts/${id}`);
}

export async function reorderAccounts(accountIds: string[]): Promise<void> {
  await api.post<ApiResponse<null>>('/accounts/reorder', { accountIds });
}
