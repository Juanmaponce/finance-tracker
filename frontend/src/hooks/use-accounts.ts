import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as accountService from '@/services/account.service';
import type { CreateAccountData } from '@/types/transaction';

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: accountService.getAccounts,
  });
}

export function useAccountBalances() {
  return useQuery({
    queryKey: ['account-balances'],
    queryFn: accountService.getAccountBalances,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAccountData) => accountService.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account-balances'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => accountService.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['account-balances'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}
