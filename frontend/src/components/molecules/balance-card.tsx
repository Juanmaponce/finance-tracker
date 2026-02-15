import { TrendingUp, TrendingDown, Wallet, CreditCard, Banknote } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import type { AccountBalance } from '@/types/transaction';

const ICONS: Record<string, typeof Wallet> = {
  wallet: Wallet,
  'credit-card': CreditCard,
  banknote: Banknote,
};

interface BalanceCardProps {
  balance: AccountBalance;
}

export function BalanceCard({ balance }: BalanceCardProps) {
  const Icon = ICONS[balance.account.icon ?? ''] ?? Wallet;
  const { currency } = balance.account;

  return (
    <div
      className="h-full flex flex-col rounded-xl bg-card border border-border p-4 hover:shadow-md transition-shadow"
      style={{ borderTopColor: balance.account.color, borderTopWidth: '3px' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className="size-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${balance.account.color}20` }}
        >
          <Icon className="size-4" style={{ color: balance.account.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm text-foreground truncate">{balance.account.name}</h3>
          <p className="text-xs text-muted-foreground">{currency}</p>
        </div>
      </div>

      {/* Balance */}
      <div className="mb-4 flex-1">
        <p className="text-xs text-muted-foreground mb-0.5">Balance disponible</p>
        <p className="text-2xl font-bold text-foreground">
          {formatCurrency(balance.balance, currency)}
        </p>
      </div>

      {/* Monthly stats */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingUp className="size-3 text-income" />
            <p className="text-[10px] text-muted-foreground">Ingresos</p>
          </div>
          <p className="text-xs font-semibold text-income">
            +{formatCurrency(balance.monthlyIncome, currency)}
          </p>
        </div>
        <div>
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingDown className="size-3 text-expense" />
            <p className="text-[10px] text-muted-foreground">Gastos</p>
          </div>
          <p className="text-xs font-semibold text-expense">
            -{formatCurrency(balance.monthlyExpenses, currency)}
          </p>
        </div>
      </div>

      {/* Total saved */}
      <div className="pt-2.5 border-t border-border">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">Total ahorrado</p>
          <p className="text-xs font-semibold text-primary-500">
            {formatCurrency(balance.totalSaved, currency)}
          </p>
        </div>
      </div>
    </div>
  );
}
