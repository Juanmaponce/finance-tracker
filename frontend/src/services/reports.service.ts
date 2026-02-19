import { api } from './api';
import type { ApiResponse } from '@/types/auth';
import type { ReportSummary, PeriodComparison, ReportFilters } from '@/types/transaction';

export async function fetchReportSummary(filters: ReportFilters): Promise<ReportSummary> {
  const params = new URLSearchParams({
    startDate: filters.startDate,
    endDate: filters.endDate,
  });
  if (filters.type) params.set('type', filters.type);
  if (filters.categoryId) params.set('categoryId', filters.categoryId);
  if (filters.accountId) params.set('accountId', filters.accountId);

  const response = await api.get<ApiResponse<ReportSummary>>(`/reports/summary?${params}`);
  return response.data;
}

export async function fetchComparison(
  period1Start: string,
  period1End: string,
  period2Start: string,
  period2End: string,
  accountId?: string,
): Promise<PeriodComparison> {
  const params = new URLSearchParams({ period1Start, period1End, period2Start, period2End });
  if (accountId) params.set('accountId', accountId);
  const response = await api.get<ApiResponse<PeriodComparison>>(`/reports/comparison?${params}`);
  return response.data;
}
