import { Target, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import type { SavingsGoal } from '@/types/transaction';

interface SavingsGoalCarouselCardProps {
  goal: SavingsGoal;
}

export function SavingsGoalCarouselCard({ goal }: SavingsGoalCarouselCardProps) {
  const remaining = goal.targetAmount - goal.currentAmount;
  const progress = Math.min(goal.progress, 100);

  return (
    <div className="h-full flex flex-col rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="size-9 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
          <Target className="size-4 text-purple-600 dark:text-purple-400" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sm text-foreground truncate">{goal.name}</h3>
          <p className="text-xs text-muted-foreground">Meta de ahorro</p>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-3 flex-1">
        <div className="flex items-baseline justify-between mb-1.5">
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatCurrency(goal.currentAmount, goal.currency)}
          </p>
          <p className="text-xs text-muted-foreground">
            de {formatCurrency(goal.targetAmount, goal.currency)}
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-2 rounded-full bg-purple-200 dark:bg-purple-900 overflow-hidden">
          <div
            className="h-full rounded-full bg-purple-600 dark:bg-purple-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{Math.round(progress)}% completado</p>
      </div>

      {/* Remaining + default account */}
      <div className="pt-2.5 border-t border-purple-200 dark:border-purple-800 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <TrendingUp className="size-3 text-purple-600 dark:text-purple-400" />
            <p className="text-[10px] text-muted-foreground">Faltan</p>
          </div>
          <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">
            {formatCurrency(remaining, goal.currency)}
          </p>
        </div>
        {goal.defaultAccount && (
          <div className="flex items-center gap-1">
            <div
              className="size-2 rounded-full"
              style={{ backgroundColor: goal.defaultAccount.color }}
            />
            <p className="text-[10px] text-muted-foreground truncate">{goal.defaultAccount.name}</p>
          </div>
        )}
      </div>
    </div>
  );
}
