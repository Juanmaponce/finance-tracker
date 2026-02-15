import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SavingsList } from '@/components/organisms/savings-list';
import { AddSavingsForm } from '@/components/organisms/add-savings-form';
import {
  useSavings,
  useDepositToSavings,
  useDeleteSavings,
  useAvailableAccounts,
} from '@/hooks/use-savings';
import { formatCurrency, sanitizeAmount } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { SavingsGoal } from '@/types/transaction';

export function SavingsPage() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositNote, setDepositNote] = useState('');
  const [depositAccountId, setDepositAccountId] = useState('');

  const { data: goals = [], isLoading } = useSavings();
  const { mutateAsync: deposit, isPending: depositing } = useDepositToSavings();
  const { mutate: remove } = useDeleteSavings();

  const depositGoalId = depositGoal?.deductFromBalance ? depositGoal.id : null;
  const { data: availableAccounts = [] } = useAvailableAccounts(depositGoalId);

  const totalSaved = goals.reduce((acc, g) => acc + g.currentAmount, 0);

  function handleDelete(goal: SavingsGoal) {
    if (!confirm(`Eliminar "${goal.name}"?`)) return;
    remove(goal.id, {
      onSuccess: () => toast.success('Meta eliminada'),
      onError: () => toast.error('Error al eliminar'),
    });
  }

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (!depositGoal) return;

    const amount = Number(depositAmount);
    if (amount <= 0) {
      toast.error('El monto debe ser mayor a cero');
      return;
    }

    try {
      await deposit({
        id: depositGoal.id,
        amount,
        note: depositNote || undefined,
        accountId: depositAccountId || undefined,
      });
      toast.success('Deposito realizado');
      setDepositGoal(null);
      setDepositAmount('');
      setDepositNote('');
      setDepositAccountId('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al depositar';
      toast.error(message);
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-md px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Volver">
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Metas de ahorro</h1>
        </div>

        {/* Summary */}
        {goals.length > 0 && (
          <div className="rounded-xl bg-gradient-to-r from-income/80 to-income p-4 text-white mb-6">
            <p className="text-xs opacity-80">Total ahorrado</p>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(totalSaved, goals[0]?.currency || 'USD')}
            </p>
            <p className="text-xs opacity-70 mt-1">
              {goals.length} meta{goals.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <SavingsList
            goals={goals}
            onDeposit={(g) => {
              setDepositGoal(g);
              setDepositAmount('');
              setDepositNote('');
              setDepositAccountId(g.defaultAccountId || '');
            }}
            onDelete={handleDelete}
            onAddFirst={() => setShowForm(true)}
          />
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 z-40 size-14 rounded-full bg-primary-500 hover:bg-primary-600 text-white shadow-lg flex items-center justify-center transition-colors"
        aria-label="Agregar meta"
      >
        <Plus className="size-6" />
      </button>

      {/* Add form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md mx-auto max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva meta de ahorro</DialogTitle>
          </DialogHeader>
          <AddSavingsForm onSuccess={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>

      {/* Deposit dialog */}
      <Dialog
        open={!!depositGoal}
        onOpenChange={(open) => {
          if (!open) setDepositGoal(null);
        }}
      >
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Depositar a "{depositGoal?.name}"</DialogTitle>
          </DialogHeader>
          {depositGoal && (
            <form onSubmit={handleDeposit} className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Disponible:{' '}
                {formatCurrency(
                  depositGoal.targetAmount - depositGoal.currentAmount,
                  depositGoal.currency,
                )}
              </div>
              {depositGoal.deductFromBalance ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                    Este deposito se restara de tu balance disponible
                  </p>
                  {availableAccounts.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="deposit-account">Cuenta origen</Label>
                      <select
                        id="deposit-account"
                        value={depositAccountId}
                        onChange={(e) => setDepositAccountId(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Cuenta por defecto</option>
                        {availableAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.icon ? `${a.icon} ` : ''}
                            {a.name} ({formatCurrency(a.availableBalance, a.currency)})
                          </option>
                        ))}
                      </select>
                      {depositAccountId &&
                        (() => {
                          const selected = availableAccounts.find((a) => a.id === depositAccountId);
                          if (!selected) return null;
                          const depositNum = Number(depositAmount) || 0;
                          const remaining = selected.availableBalance - depositNum;
                          return (
                            <p
                              className={cn(
                                'text-xs px-1',
                                remaining < 0 ? 'text-destructive' : 'text-muted-foreground',
                              )}
                            >
                              Disponible:{' '}
                              {formatCurrency(selected.availableBalance, selected.currency)}
                              {depositNum > 0 &&
                                ` → ${formatCurrency(remaining, selected.currency)}`}
                            </p>
                          );
                        })()}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                  Este deposito no afectara tu balance disponible
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="deposit-amount">Monto</Label>
                <Input
                  id="deposit-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(sanitizeAmount(e.target.value))}
                  className="h-11 text-lg font-semibold"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit-note">Nota (opcional)</Label>
                <Input
                  id="deposit-note"
                  type="text"
                  placeholder="Ej: Ahorro del mes"
                  value={depositNote}
                  onChange={(e) => setDepositNote(e.target.value)}
                  maxLength={500}
                  className="h-11"
                />
              </div>
              <Button
                type="submit"
                disabled={
                  depositing ||
                  (!!depositAccountId &&
                    (() => {
                      const sel = availableAccounts.find((a) => a.id === depositAccountId);
                      return sel ? sel.availableBalance < (Number(depositAmount) || 0) : false;
                    })())
                }
                className="w-full h-11 bg-income hover:bg-income/90 text-white rounded-xl font-medium"
              >
                {depositing ? 'Depositando...' : 'Depositar'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
