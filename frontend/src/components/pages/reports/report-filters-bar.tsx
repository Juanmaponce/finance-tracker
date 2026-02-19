import type { Category, Account } from '@/types/transaction';

type PeriodType = 'week' | 'month' | 'custom';
type ViewTab = 'summary' | 'comparison';

interface ReportFiltersBarProps {
  period: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  tab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
  filterType: 'EXPENSE' | 'INCOME' | undefined;
  onFilterTypeChange: (value: 'EXPENSE' | 'INCOME' | undefined) => void;
  filterCategory: string | undefined;
  onFilterCategoryChange: (value: string | undefined) => void;
  selectedAccountId: string | undefined;
  onAccountChange: (value: string | undefined) => void;
  categories: Category[];
  accounts: Account[];
}

export function ReportFiltersBar({
  period,
  onPeriodChange,
  tab,
  onTabChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
  filterType,
  onFilterTypeChange,
  filterCategory,
  onFilterCategoryChange,
  selectedAccountId,
  onAccountChange,
  categories,
  accounts,
}: ReportFiltersBarProps) {
  return (
    <div className="space-y-3 mb-6">
      {/* Period selector */}
      <div className="flex gap-2">
        {(['week', 'month', 'custom'] as PeriodType[]).map((p) => (
          <button
            key={p}
            onClick={() => onPeriodChange(p)}
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
        <div className="flex gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => onCustomStartChange(e.target.value)}
            className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Fecha inicio"
          />
          <input
            type="date"
            value={customEnd}
            onChange={(e) => onCustomEndChange(e.target.value)}
            className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Fecha fin"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(['summary', 'comparison'] as ViewTab[]).map((t) => (
          <button
            key={t}
            onClick={() => onTabChange(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
            }`}
          >
            {t === 'summary' ? 'Resumen' : 'Comparativa'}
          </button>
        ))}
      </div>

      {/* Filter row: account + type + category */}
      <div className="rounded-xl bg-muted/30 p-3 space-y-2">
        <select
          value={selectedAccountId || ''}
          onChange={(e) => onAccountChange(e.target.value || undefined)}
          className="w-full h-9 px-2 rounded-lg border border-border bg-background text-xs text-foreground"
          aria-label="Filtrar por cuenta"
        >
          <option value="" className="bg-card text-card-foreground">
            Todas las cuentas
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id} className="bg-card text-card-foreground">
              {a.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select
            value={filterType || ''}
            onChange={(e) =>
              onFilterTypeChange((e.target.value || undefined) as 'EXPENSE' | 'INCOME' | undefined)
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
            onChange={(e) => onFilterCategoryChange(e.target.value || undefined)}
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
      </div>
    </div>
  );
}
