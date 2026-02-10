import { Trash2, Paperclip } from 'lucide-react';
import { CategoryIcon } from '@/components/atoms/category-icon';
import { formatCurrency, formatDate } from '@/utils/format';
import type { Transaction } from '@/types/transaction';

interface ExpenseCardProps {
  transaction: Transaction;
  onDelete?: (id: string) => void;
  onClick?: (transaction: Transaction) => void;
}

export function ExpenseCard({ transaction, onDelete, onClick }: ExpenseCardProps) {
  const isExpense = transaction.type === 'EXPENSE';
  const isSavingsTransfer = transaction.type === 'TRANSFER_TO_SAVINGS';

  function getAmountColor() {
    if (isSavingsTransfer) return 'text-primary-500';
    return isExpense ? 'text-expense' : 'text-income';
  }

  function getAmountPrefix() {
    if (isSavingsTransfer) return '-';
    return isExpense ? '-' : '+';
  }

  return (
    <div
      className="flex items-center gap-3 py-3 cursor-pointer hover:bg-muted/30 -mx-1 px-1 rounded-lg transition-colors"
      onClick={() => onClick?.(transaction)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick?.(transaction);
      }}
      aria-label={`${transaction.description || transaction.category.name}, ${formatCurrency(transaction.amount, transaction.currency)}`}
    >
      <CategoryIcon icon={transaction.category.icon} color={transaction.category.color} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium text-foreground truncate">
            {transaction.description || transaction.category.name}
          </p>
          {transaction.receiptUrl && (
            <Paperclip
              className="size-3 text-muted-foreground shrink-0"
              aria-label="Tiene recibo"
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {transaction.category.name} · {formatDate(transaction.date)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <p className={`text-sm font-semibold ${getAmountColor()}`}>
          {getAmountPrefix()}
          {formatCurrency(transaction.amount, transaction.currency)}
        </p>
        {onDelete && !isSavingsTransfer && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(transaction.id);
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Eliminar transaccion"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
