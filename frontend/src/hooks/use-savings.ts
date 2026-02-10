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
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDepositToSavings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, amount, note }: { id: string; amount: number; note?: string }) =>
      savingsService.depositToSavings(id, amount, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeposits(goalId: string | null) {
  return useQuery({
    queryKey: ['savings', goalId, 'deposits'],
    queryFn: () => savingsService.getDeposits(goalId!),
    enabled: !!goalId,
  });
}

export function useDeleteSavings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => savingsService.deleteSavings(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
