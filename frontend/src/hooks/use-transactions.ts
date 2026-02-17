import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as transactionService from '@/services/transaction.service';
import * as categoryService from '@/services/category.service';
import type {
  TransactionFilters,
  CreateTransactionData,
  CreateCategoryData,
  UpdateCategoryData,
  Transaction,
} from '@/types/transaction';

export function useDashboardStats(accountId?: string) {
  return useQuery({
    queryKey: ['dashboard-stats', accountId ?? 'all'],
    queryFn: () => transactionService.getDashboardStats(accountId),
  });
}

export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => transactionService.getTransactions(filters),
  });
}

export function useCategories(type?: 'EXPENSE' | 'INCOME') {
  return useQuery({
    queryKey: ['categories', type],
    queryFn: () => categoryService.getCategories(type),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransactionData) => transactionService.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['account-balances'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => transactionService.deleteTransaction(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ['transactions'] });

      const previousQueries = queryClient.getQueriesData<{ transactions: Transaction[] }>({
        queryKey: ['transactions'],
      });

      queryClient.setQueriesData<{ transactions: Transaction[] }>(
        { queryKey: ['transactions'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            transactions: old.transactions.filter((t) => t.id !== deletedId),
          };
        },
      );

      return { previousQueries };
    },
    onError: (_err, _id, context) => {
      if (context?.previousQueries) {
        for (const [queryKey, data] of context.previousQueries) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['account-balances'] });
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCategoryData) => categoryService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCategoryData }) =>
      categoryService.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => categoryService.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });
}
