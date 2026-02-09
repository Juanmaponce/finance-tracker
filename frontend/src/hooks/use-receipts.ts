import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as receiptService from '@/services/receipt.service';

export function useUploadReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionId, file }: { transactionId: string; file: File }) =>
      receiptService.uploadReceipt(transactionId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}

export function useDeleteReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) => receiptService.deleteReceipt(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
