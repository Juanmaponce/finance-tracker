import { SavingsCard } from '@/components/molecules/savings-card';
import type { SavingsGoal } from '@/types/transaction';

interface SavingsListProps {
  goals: SavingsGoal[];
  onDeposit: (goal: SavingsGoal) => void;
  onDelete: (goal: SavingsGoal) => void;
  onAddFirst: () => void;
}

export function SavingsList({ goals, onDeposit, onDelete, onAddFirst }: SavingsListProps) {
  if (goals.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-2">No hay metas de ahorro</p>
        <button onClick={onAddFirst} className="text-sm text-primary-500 font-medium">
          Crear la primera
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {goals.map((goal) => (
        <SavingsCard key={goal.id} goal={goal} onDeposit={onDeposit} onDelete={onDelete} />
      ))}
    </div>
  );
}
