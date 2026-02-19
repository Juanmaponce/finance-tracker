import { useQuery } from '@tanstack/react-query';
import { fetchReportSummary, fetchComparison } from '@/services/reports.service';
import type { ReportFilters } from '@/types/transaction';

export function useReportSummary(filters: ReportFilters) {
  return useQuery({
    queryKey: ['report-summary', filters],
    queryFn: () => fetchReportSummary(filters),
    staleTime: 5 * 60 * 1000,
  });
}

export function useReportComparison(
  period1Start: string,
  period1End: string,
  period2Start: string,
  period2End: string,
  enabled: boolean = true,
  accountId?: string,
) {
  return useQuery({
    queryKey: ['report-comparison', period1Start, period1End, period2Start, period2End, accountId],
    queryFn: () => fetchComparison(period1Start, period1End, period2Start, period2End, accountId),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}
