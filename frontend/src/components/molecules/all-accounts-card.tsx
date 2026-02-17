import { Layers } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import type { AccountBalance } from '@/types/transaction';
import { useAuthStore } from '@/stores/auth.store';

interface AllAccountsCardProps {
  balances: AccountBalance[];
}

export function AllAccountsCard({ balances }: AllAccountsCardProps) {
  const { user } = useAuthStore();
  const currency = user?.primaryCurrency || 'USD';

  const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);
  const totalIncome = balances.reduce((sum, b) => sum + b.monthlyIncome, 0);
  const totalExpenses = balances.reduce((sum, b) => sum + b.monthlyExpenses, 0);

  return (
    <div className="h-full flex flex-col rounded-xl bg-card border border-border p-4 hover:shadow-md transition-shadow border-t-[3px] border-t-primary-500">
      <div className="flex items-center gap-2 mb-4">
        <div className="size-9 rounded-lg bg-primary-500/10 flex items-center justify-center">
          <Layers className="size-4 text-primary-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm text-foreground truncate">Todas las cuentas</h3>
          <p className="text-xs text-muted-foreground">{currency}</p>
        </div>
      </div>

      <div className="mb-4 flex-1">
        <p className="text-xs text-muted-foreground mb-0.5">Balance total</p>
        <p className="text-2xl font-bold text-foreground">
          {formatCurrency(totalBalance, currency)}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Ingresos del mes</p>
          <p className="text-xs font-semibold text-income">
            +{formatCurrency(totalIncome, currency)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-0.5">Gastos del mes</p>
          <p className="text-xs font-semibold text-expense">
            -{formatCurrency(totalExpenses, currency)}
          </p>
        </div>
      </div>
    </div>
  );
}
