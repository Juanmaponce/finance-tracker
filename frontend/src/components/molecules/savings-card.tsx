import { DollarSign, Trash2, Plus } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { SavingsGoal } from '@/types/transaction';

interface SavingsCardProps {
  goal: SavingsGoal;
  onDeposit: (goal: SavingsGoal) => void;
  onDelete: (goal: SavingsGoal) => void;
}

export function SavingsCard({ goal, onDeposit, onDelete }: SavingsCardProps) {
  const isComplete = goal.progress >= 100;
  const deadlineStr = goal.deadline
    ? new Date(goal.deadline).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  return (
    <div className="rounded-xl bg-card border border-border p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'size-8 rounded-lg flex items-center justify-center',
              isComplete ? 'bg-income/20' : 'bg-primary-500/10',
            )}
          >
            <DollarSign className={cn('size-4', isComplete ? 'text-income' : 'text-primary-500')} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-foreground">{goal.name}</p>
              {!goal.deductFromBalance && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                  No afecta balance
                </span>
              )}
            </div>
            {deadlineStr && (
              <p className="text-[10px] text-muted-foreground">Meta: {deadlineStr}</p>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          {!isComplete && (
            <button
              onClick={() => onDeposit(goal)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="Depositar"
            >
              <Plus className="size-4 text-primary-500" />
            </button>
          )}
          <button
            onClick={() => onDelete(goal)}
            className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
            aria-label="Eliminar"
          >
            <Trash2 className="size-4 text-destructive" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isComplete ? 'bg-income' : 'bg-primary-500',
            )}
            style={{ width: `${Math.min(goal.progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Amounts */}
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">
          {formatCurrency(goal.currentAmount, goal.currency)}
        </span>
        <span className="font-medium text-foreground">{goal.progress.toFixed(1)}%</span>
        <span className="text-muted-foreground">
          {formatCurrency(goal.targetAmount, goal.currency)}
        </span>
      </div>
    </div>
  );
}
