import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as savingsService from '@/services/savings.service';
import type { CreateSavingsData, UpdateSavingsData } from '@/types/transaction';

export function useSavings() {
  return useQuery({
    queryKey: ['savings'],
    queryFn: savingsService.getSavings,
  });
}

export function useCreateSavings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSavingsData) => savingsService.createSavings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] });
    },
  });
}

export function useUpdateSavings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSavingsData }) =>
      savingsService.updateSavings(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] });
    },
  });
}

export function useDepositToSavings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      savingsService.depositToSavings(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] });
    },
  });
}

export function useDeleteSavings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => savingsService.deleteSavings(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] });
    },
  });
}
