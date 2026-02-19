import { ChangeCard, ComparisonChart } from './report-sub-components';
import { formatCurrency } from '@/utils/format';
import type { PeriodComparison } from '@/types/transaction';

interface ReportComparisonViewProps {
  comparison: PeriodComparison;
  currency: string;
}

export function ReportComparisonView({ comparison, currency }: ReportComparisonViewProps) {
  return (
    <div className="space-y-6">
      {/* Period labels */}
      <div className="flex gap-3">
        <div className="flex-1 p-3 rounded-xl bg-muted/50 text-center">
          <p className="text-[10px] text-muted-foreground">Periodo anterior</p>
          <p className="text-xs font-medium text-foreground">
            {comparison.period1.startDate.slice(5)} - {comparison.period1.endDate.slice(5)}
          </p>
        </div>
        <div className="flex-1 p-3 rounded-xl bg-primary-500/10 text-center">
          <p className="text-[10px] text-muted-foreground">Periodo actual</p>
          <p className="text-xs font-medium text-foreground">
            {comparison.period2.startDate.slice(5)} - {comparison.period2.endDate.slice(5)}
          </p>
        </div>
      </div>

      {/* Change indicators */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Variacion
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <ChangeCard
            label="Gastos"
            previous={formatCurrency(comparison.period1.totalExpenses, currency)}
            current={formatCurrency(comparison.period2.totalExpenses, currency)}
            change={comparison.changes.expenses}
            invertColor
          />
          <ChangeCard
            label="Ingresos"
            previous={formatCurrency(comparison.period1.totalIncome, currency)}
            current={formatCurrency(comparison.period2.totalIncome, currency)}
            change={comparison.changes.income}
          />
          <ChangeCard
            label="Balance"
            previous={formatCurrency(comparison.period1.balance, currency)}
            current={formatCurrency(comparison.period2.balance, currency)}
            change={comparison.changes.balance}
          />
          <ChangeCard
            label="Transacciones"
            previous={comparison.period1.transactionCount.toString()}
            current={comparison.period2.transactionCount.toString()}
            change={comparison.changes.transactionCount}
          />
        </div>
      </section>

      {/* Comparison bar chart */}
      {(comparison.period1.byCategory.length > 0 || comparison.period2.byCategory.length > 0) && (
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Comparativa por categoria
          </h2>
          <div className="rounded-xl bg-card p-4 border border-border">
            <ComparisonChart
              period1={comparison.period1.byCategory}
              period2={comparison.period2.byCategory}
              currency={currency}
            />
          </div>
        </section>
      )}
    </div>
  );
}
