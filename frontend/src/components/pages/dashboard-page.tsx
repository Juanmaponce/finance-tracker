import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Grid3X3, Repeat, PiggyBank, BarChart3, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DashboardSkeleton } from '@/components/molecules/dashboard-skeleton';
import { TransactionList } from '@/components/organisms/transaction-list';
import { AddTransactionForm } from '@/components/organisms/add-transaction-form';
import { CategoryChart } from '@/components/organisms/category-chart';
import { TransactionDetailDialog } from '@/components/organisms/transaction-detail-dialog';
import { useDashboardStats, useDeleteTransaction } from '@/hooks/use-transactions';
import { useAuthStore } from '@/stores/auth.store';
import { formatCurrency } from '@/utils/format';
import type { Transaction } from '@/types/transaction';

export function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const { data: stats, isLoading } = useDashboardStats();
  const { mutate: deleteTransaction } = useDeleteTransaction();

  function handleDelete(id: string) {
    deleteTransaction(id, {
      onSuccess: () => toast.success('Transaccion eliminada'),
      onError: () => toast.error('Error al eliminar'),
    });
  }

  const currency = user?.primaryCurrency || 'USD';

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto max-w-md px-4 py-6">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-md px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Hola, {user?.displayName}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/categories')}
              aria-label="Categorias"
            >
              <Grid3X3 className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
              aria-label="Configuracion"
            >
              <Settings className="size-5" />
            </Button>
          </div>
        </div>

        {/* Balance card */}
        <div className="rounded-xl bg-gradient-to-r from-primary-500 to-primary-400 p-6 text-white mb-6">
          <p className="text-sm opacity-80">Balance del mes</p>
          <p className="text-3xl font-bold mt-1">{formatCurrency(stats?.balance ?? 0, currency)}</p>
          <div className="flex justify-between mt-4 text-sm">
            <div>
              <p className="opacity-70">Ingresos</p>
              <p className="font-semibold text-white">
                +{formatCurrency(stats?.totalIncome ?? 0, currency)}
              </p>
            </div>
            <div>
              <p className="opacity-70">Gastos</p>
              <p className="font-semibold text-white">
                -{formatCurrency(stats?.totalExpenses ?? 0, currency)}
              </p>
            </div>
          </div>
        </div>

        {/* Quick nav */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button
            onClick={() => navigate('/recurring')}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
          >
            <div className="size-9 rounded-lg bg-primary-500/10 flex items-center justify-center">
              <Repeat className="size-4 text-primary-500" />
            </div>
            <p className="text-xs font-medium text-foreground">Recurrentes</p>
          </button>
          <button
            onClick={() => navigate('/savings')}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
          >
            <div className="size-9 rounded-lg bg-income/10 flex items-center justify-center">
              <PiggyBank className="size-4 text-income" />
            </div>
            <p className="text-xs font-medium text-foreground">Ahorros</p>
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors"
          >
            <div className="size-9 rounded-lg bg-expense/10 flex items-center justify-center">
              <BarChart3 className="size-4 text-expense" />
            </div>
            <p className="text-xs font-medium text-foreground">Reportes</p>
          </button>
        </div>

        {/* Category chart */}
        {stats && stats.expensesByCategory.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-foreground mb-3">Gastos por categoria</h2>
            <div className="rounded-xl bg-card p-4 border border-border">
              <CategoryChart data={stats.expensesByCategory} currency={currency} />
            </div>
          </div>
        )}

        {/* Recent transactions */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Transacciones recientes</h2>
          <div className="rounded-xl bg-card p-4 border border-border">
            <TransactionList
              transactions={stats?.recentTransactions ?? []}
              isLoading={false}
              onDelete={handleDelete}
              onAddFirst={() => setShowAddForm(true)}
              onTransactionClick={setSelectedTransaction}
            />
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAddForm(true)}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40 size-14 rounded-full bg-primary-500 hover:bg-primary-600 text-white shadow-lg flex items-center justify-center transition-colors"
        aria-label="Agregar transaccion"
      >
        <Plus className="size-6" />
      </button>

      {/* Add transaction dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-md mx-auto max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva transaccion</DialogTitle>
          </DialogHeader>
          <AddTransactionForm onSuccess={() => setShowAddForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Transaction detail dialog with receipt management */}
      <TransactionDetailDialog
        transaction={selectedTransaction}
        open={!!selectedTransaction}
        onOpenChange={(open) => {
          if (!open) setSelectedTransaction(null);
        }}
      />
    </div>
  );
}
