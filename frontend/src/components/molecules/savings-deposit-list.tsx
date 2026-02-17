import { PiggyBank } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/molecules/empty-state';
import { formatCurrency } from '@/utils/format';
import type { SavingsDeposit } from '@/types/transaction';

interface SavingsDepositListProps {
  deposits: SavingsDeposit[];
  isLoading: boolean;
}

export function SavingsDepositList({ deposits, isLoading }: SavingsDepositListProps) {
  if (isLoading) {
    return (
      <div className="space-y-1">
        {Array.from({ length: 3 }).map((_, i) => (
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

  if (deposits.length === 0) {
    return (
      <EmptyState
        icon={PiggyBank}
        title="Sin depositos"
        description="Aun no hay depositos en esta meta de ahorro"
      />
    );
  }

  return (
    <div className="divide-y divide-border" role="list" aria-label="Depositos">
      {deposits.map((deposit) => (
        <div key={deposit.id} role="listitem" className="flex items-center gap-3 py-3">
          <div className="size-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
            <PiggyBank className="size-4 text-primary-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {deposit.note || 'Deposito'}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(deposit.createdAt).toLocaleDateString()}
            </p>
          </div>
          <p className="text-sm font-semibold text-primary-500">
            +{formatCurrency(deposit.amount, deposit.currency)}
          </p>
        </div>
      ))}
    </div>
  );
}
