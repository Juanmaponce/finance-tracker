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
    mutationFn: ({
      id,
      amount,
      note,
      accountId,
    }: {
      id: string;
      amount: number;
      note?: string;
      accountId?: string;
    }) => savingsService.depositToSavings(id, amount, note, accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['account-balances'] });
    },
  });
}

export function useAvailableAccounts(goalId: string | null) {
  return useQuery({
    queryKey: ['savings', goalId, 'available-accounts'],
    queryFn: () => savingsService.getAvailableAccounts(goalId!),
    enabled: !!goalId,
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
