import { useQuery } from '@tanstack/react-query';
import { fetchRates } from '@/services/currency.service';

export function useExchangeRates(base: string = 'USD') {
  return useQuery({
    queryKey: ['exchange-rates', base],
    queryFn: () => fetchRates(base),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 1,
  });
}
