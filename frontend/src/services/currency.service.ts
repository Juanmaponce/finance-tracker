import { api } from './api';
import type { ApiResponse } from '@/types/auth';

interface RatesResponse {
  base: string;
  rates: Record<string, number>;
}

export async function fetchRates(base: string = 'USD'): Promise<RatesResponse> {
  const response = await api.get<ApiResponse<RatesResponse>>(`/currency/rates?base=${base}`);
  return response.data;
}

export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
): number {
  if (from === to) return amount;
  const rate = rates[to] || 1;
  return Math.round(amount * rate * 100) / 100;
}
