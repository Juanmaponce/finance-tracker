import { TrendingDown, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from 'recharts';
import { StatCard } from './report-sub-components';
import { formatCurrency } from '@/utils/format';
import type { ReportSummary } from '@/types/transaction';

interface ReportSummaryViewProps {
  summary: ReportSummary;
  currency: string;
}

export function ReportSummaryView({ summary, currency }: ReportSummaryViewProps) {
  if (summary.transactionCount === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No hay transacciones en este periodo</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary section */}
      <section>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Resumen del periodo
        </h2>
        <div className="rounded-xl bg-card border border-border p-4 space-y-4">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Gastos"
              value={formatCurrency(summary.totalExpenses, currency)}
              icon={<TrendingDown className="size-4" />}
              color="text-expense"
              bgColor="bg-expense/10"
            />
            <StatCard
              label="Ingresos"
              value={formatCurrency(summary.totalIncome, currency)}
              icon={<TrendingUp className="size-4" />}
              color="text-income"
              bgColor="bg-income/10"
            />
            <StatCard
              label="Balance"
              value={formatCurrency(summary.balance, currency)}
              icon={<DollarSign className="size-4" />}
              color={summary.balance >= 0 ? 'text-income' : 'text-expense'}
              bgColor={summary.balance >= 0 ? 'bg-income/10' : 'bg-expense/10'}
            />
            <StatCard
              label="Transacciones"
              value={summary.transactionCount.toString()}
              icon={<BarChart3 className="size-4" />}
              color="text-primary-500"
              bgColor="bg-primary-500/10"
            />
          </div>

          {/* Divider + averages */}
          <div className="border-t border-border pt-4 flex gap-3">
            <div className="flex-1 p-3 rounded-xl bg-muted/30">
              <p className="text-[10px] text-muted-foreground">Gasto promedio</p>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(summary.avgExpense, currency)}
              </p>
            </div>
            <div className="flex-1 p-3 rounded-xl bg-muted/30">
              <p className="text-[10px] text-muted-foreground">Ingreso promedio</p>
              <p className="text-sm font-semibold text-foreground">
                {formatCurrency(summary.avgIncome, currency)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Category breakdown chart + list */}
      {summary.byCategory.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Gastos por categoria
          </h2>
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="p-4">
              <ResponsiveContainer width="100%" height={summary.byCategory.length * 44 + 16}>
                <BarChart
                  data={summary.byCategory}
                  layout="vertical"
                  margin={{ left: 0, right: 8, top: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="categoryName"
                    width={90}
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: unknown) => [
                      formatCurrency(Number(value), currency),
                      'Total',
                    ]}
                    contentStyle={{
                      borderRadius: 8,
                      fontSize: 12,
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      color: 'var(--card-foreground)',
                    }}
                  />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={24}>
                    {summary.byCategory.map((entry, i) => (
                      <Cell key={i} fill={entry.categoryColor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Category detail list */}
            <div className="divide-y divide-border border-t border-border">
              {summary.byCategory.map((c) => (
                <div key={c.categoryId} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="size-3 rounded-full"
                      style={{ backgroundColor: c.categoryColor }}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.categoryName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {c.count} transaccion{c.count !== 1 ? 'es' : ''} · {c.percentage}%
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {formatCurrency(c.total, currency)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Daily trend */}
      {summary.dailyTrend.length > 1 && (
        <section>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Tendencia diaria
          </h2>
          <div className="rounded-xl bg-card p-4 border border-border">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart
                data={summary.dailyTrend}
                margin={{ left: 0, right: 0, top: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                  tickFormatter={(v: string) => v.slice(5)}
                  axisLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(value: unknown, name: unknown) => [
                    formatCurrency(Number(value), currency),
                    String(name) === 'expenses' ? 'Gastos' : 'Ingresos',
                  ]}
                  labelFormatter={(label: unknown) => String(label)}
                  contentStyle={{
                    borderRadius: 8,
                    fontSize: 12,
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    color: 'var(--card-foreground)',
                  }}
                />
                <Legend
                  formatter={(value: string) => (value === 'expenses' ? 'Gastos' : 'Ingresos')}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="var(--expense)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  stroke="var(--income)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}
