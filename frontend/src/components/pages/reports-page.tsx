import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReportSummary, useReportComparison } from '@/hooks/use-reports';
import { useCategories } from '@/hooks/use-transactions';
import { useAccounts } from '@/hooks/use-accounts';
import { useAuthStore } from '@/stores/auth.store';
import { ReportFiltersBar } from './reports/report-filters-bar';
import { ReportSummaryView } from './reports/report-summary-view';
import { ReportComparisonView } from './reports/report-comparison-view';
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
  const [selectedAccountId, setSelectedAccountId] = useState<string | undefined>(undefined);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();

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
    accountId: selectedAccountId,
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
    selectedAccountId,
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

        <ReportFiltersBar
          period={period}
          onPeriodChange={setPeriod}
          tab={tab}
          onTabChange={setTab}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
          filterType={filterType}
          onFilterTypeChange={setFilterType}
          filterCategory={filterCategory}
          onFilterCategoryChange={setFilterCategory}
          selectedAccountId={selectedAccountId}
          onAccountChange={setSelectedAccountId}
          categories={categories}
          accounts={accounts}
        />

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
          <ReportSummaryView summary={summary} currency={currency} />
        )}

        {/* Comparison tab */}
        {!isLoading && tab === 'comparison' && comparison && (
          <ReportComparisonView comparison={comparison} currency={currency} />
        )}
      </div>
    </div>
  );
}
