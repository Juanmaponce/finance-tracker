import { Receipt } from 'lucide-react';
import { ExpenseCard } from '@/components/molecules/expense-card';
import { EmptyState } from '@/components/molecules/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { Transaction } from '@/types/transaction';

interface TransactionListProps {
  transactions: Transaction[];
  isLoading: boolean;
  onDelete?: (id: string) => void;
  onAddFirst?: () => void;
  onTransactionClick?: (transaction: Transaction) => void;
}

export function TransactionList({
  transactions,
  isLoading,
  onDelete,
  onAddFirst,
  onTransactionClick,
}: TransactionListProps) {
  if (isLoading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <Skeleton className="size-10 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Sin transacciones"
        description="Agrega tu primer gasto o ingreso para empezar a trackear tus finanzas"
        actionLabel="Agregar transaccion"
        onAction={onAddFirst}
      />
    );
  }

  return (
    <div className="divide-y divide-border" role="list" aria-label="Transacciones">
      {transactions.map((transaction) => (
        <div key={transaction.id} role="listitem">
          <ExpenseCard transaction={transaction} onDelete={onDelete} onClick={onTransactionClick} />
        </div>
      ))}
    </div>
  );
}
