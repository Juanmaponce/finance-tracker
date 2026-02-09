import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, TrendingDown, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { useReportSummary, useReportComparison } from '@/hooks/use-reports';
import { useCategories } from '@/hooks/use-transactions';
import { useAuthStore } from '@/stores/auth.store';
import { formatCurrency } from '@/utils/format';
import type { ReportFilters } from '@/types/transaction';

type PeriodType = 'week' | 'month' | 'custom';
type ViewTab = 'summary' | 'comparison';

function getDateRange(period: PeriodType): { startDate: string; endDate: string } {
  const now = new Date();
  if (period === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  }
  // month (default)
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: now.toISOString().split('T')[0],
  };
}

function getPreviousPeriod(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - days);
  return {
    startDate: prevStart.toISOString().split('T')[0],
    endDate: prevEnd.toISOString().split('T')[0],
  };
}

export function ReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const currency = user?.primaryCurrency || 'USD';

  const [period, setPeriod] = useState<PeriodType>('month');
  const [tab, setTab] = useState<ViewTab>('summary');
  const [filterType, setFilterType] = useState<'EXPENSE' | 'INCOME' | undefined>(undefined);
  const [filterCategory, setFilterCategory] = useState<string | undefined>(undefined);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { data: categories = [] } = useCategories();

  const dateRange = useMemo(() => {
    if (period === 'custom' && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    return getDateRange(period);
  }, [period, customStart, customEnd]);

  const filters: ReportFilters = {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    type: filterType,
    categoryId: filterCategory,
  };

  const { data: summary, isLoading } = useReportSummary(filters);

  const prevPeriod = useMemo(
    () => getPreviousPeriod(dateRange.startDate, dateRange.endDate),
    [dateRange],
  );
  const { data: comparison } = useReportComparison(
    prevPeriod.startDate,
    prevPeriod.endDate,
    dateRange.startDate,
    dateRange.endDate,
    tab === 'comparison',
  );

  function exportCSV() {
    if (!summary) return;
    const rows = [
      ['Categoria', 'Total', 'Transacciones', 'Porcentaje'],
      ...summary.byCategory.map((c) => [
        c.categoryName,
        c.total.toString(),
        c.count.toString(),
        `${c.percentage}%`,
      ]),
      [],
      ['Total Gastos', summary.totalExpenses.toString()],
      ['Total Ingresos', summary.totalIncome.toString()],
      ['Balance', summary.balance.toString()],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${dateRange.startDate}_${dateRange.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-md px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Volver">
              <ArrowLeft className="size-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Reportes</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={exportCSV}
            disabled={!summary}
            aria-label="Exportar CSV"
          >
            <Download className="size-5" />
          </Button>
        </div>

        {/* Period selector */}
        <div className="flex gap-2 mb-4">
          {(['week', 'month', 'custom'] as PeriodType[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                period === p ? 'bg-primary-500 text-white' : 'bg-muted text-muted-foreground'
              }`}
            >
              {p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Otro'}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {period === 'custom' && (
          <div className="flex gap-2 mb-4">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Fecha inicio"
            />
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Fecha fin"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(['summary', 'comparison'] as ViewTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
              }`}
            >
              {t === 'summary' ? 'Resumen' : 'Comparativa'}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <select
            value={filterType || ''}
            onChange={(e) =>
              setFilterType((e.target.value || undefined) as 'EXPENSE' | 'INCOME' | undefined)
            }
            className="flex-1 h-9 px-2 rounded-lg border border-border bg-background text-xs text-foreground"
            aria-label="Filtrar por tipo"
          >
            <option value="" className="bg-card text-card-foreground">
              Todos
            </option>
            <option value="EXPENSE" className="bg-card text-card-foreground">
              Gastos
            </option>
            <option value="INCOME" className="bg-card text-card-foreground">
              Ingresos
            </option>
          </select>
          <select
            value={filterCategory || ''}
            onChange={(e) => setFilterCategory(e.target.value || undefined)}
            className="flex-1 h-9 px-2 rounded-lg border border-border bg-background text-xs text-foreground truncate"
            aria-label="Filtrar por categoria"
          >
            <option value="" className="bg-card text-card-foreground">
              Todas categorias
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-card text-card-foreground">
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Summary tab */}
        {!isLoading && summary && tab === 'summary' && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
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

            {/* Averages */}
            <div className="flex gap-3 mb-6">
              <div className="flex-1 p-3 rounded-xl bg-card border border-border">
                <p className="text-[10px] text-muted-foreground">Gasto promedio</p>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(summary.avgExpense, currency)}
                </p>
              </div>
              <div className="flex-1 p-3 rounded-xl bg-card border border-border">
                <p className="text-[10px] text-muted-foreground">Ingreso promedio</p>
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(summary.avgIncome, currency)}
                </p>
              </div>
            </div>

            {/* Bar chart by category */}
            {summary.byCategory.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-foreground mb-3">Gastos por categoria</h2>
                <div className="rounded-xl bg-card p-4 border border-border">
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
              </div>
            )}

            {/* Category breakdown list */}
            {summary.byCategory.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-foreground mb-3">
                  Detalle por categoria
                </h2>
                <div className="rounded-xl bg-card border border-border divide-y divide-border">
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
            )}

            {/* Line chart - daily trend */}
            {summary.dailyTrend.length > 1 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-foreground mb-3">Tendencia diaria</h2>
                <div className="rounded-xl bg-card p-4 border border-border">
                  <ResponsiveContainer width="100%" height={200}>
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
                        formatter={(value: string) =>
                          value === 'expenses' ? 'Gastos' : 'Ingresos'
                        }
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
              </div>
            )}

            {/* Empty state */}
            {summary.transactionCount === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No hay transacciones en este periodo</p>
              </div>
            )}
          </>
        )}

        {/* Comparison tab */}
        {!isLoading && tab === 'comparison' && comparison && (
          <>
            {/* Period labels */}
            <div className="flex gap-3 mb-4">
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
            <div className="grid grid-cols-2 gap-3 mb-6">
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

            {/* Comparison bar chart */}
            {(comparison.period1.byCategory.length > 0 ||
              comparison.period2.byCategory.length > 0) && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-foreground mb-3">
                  Comparativa por categoria
                </h2>
                <div className="rounded-xl bg-card p-4 border border-border">
                  <ComparisonChart
                    period1={comparison.period1.byCategory}
                    period2={comparison.period2.byCategory}
                    currency={currency}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  bgColor,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-2 mb-1">
        <div className={`size-6 rounded-md ${bgColor} flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function ChangeCard({
  label,
  previous,
  current,
  change,
  invertColor,
}: {
  label: string;
  previous: string;
  current: string;
  change: number;
  invertColor?: boolean;
}) {
  const isPositive = invertColor ? change < 0 : change > 0;
  const changeColor =
    change === 0 ? 'text-muted-foreground' : isPositive ? 'text-income' : 'text-expense';

  return (
    <div className="p-3 rounded-xl bg-card border border-border">
      <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold text-foreground">{current}</p>
      <div className="flex items-center gap-1 mt-1">
        <span className={`text-[10px] font-medium ${changeColor}`}>
          {change > 0 ? '+' : ''}
          {change}%
        </span>
        <span className="text-[10px] text-muted-foreground">vs {previous}</span>
      </div>
    </div>
  );
}

function ComparisonChart({
  period1,
  period2,
  currency,
}: {
  period1: { categoryName: string; total: number; categoryColor: string }[];
  period2: { categoryName: string; total: number; categoryColor: string }[];
  currency: string;
}) {
  // Merge categories from both periods
  const categoryNames = new Set([
    ...period1.map((c) => c.categoryName),
    ...period2.map((c) => c.categoryName),
  ]);

  const data = Array.from(categoryNames).map((name) => {
    const p1 = period1.find((c) => c.categoryName === name);
    const p2 = period2.find((c) => c.categoryName === name);
    return {
      name,
      anterior: p1?.total || 0,
      actual: p2?.total || 0,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={data.length * 48 + 32}>
      <BarChart data={data} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={90}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: unknown) => formatCurrency(Number(value), currency)}
          contentStyle={{
            borderRadius: 8,
            fontSize: 12,
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            color: 'var(--card-foreground)',
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="anterior" fill="var(--muted-foreground)" radius={[0, 4, 4, 0]} barSize={12} />
        <Bar dataKey="actual" fill="var(--primary-500)" radius={[0, 4, 4, 0]} barSize={12} />
      </BarChart>
    </ResponsiveContainer>
  );
}
