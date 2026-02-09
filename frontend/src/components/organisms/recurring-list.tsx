import toast from 'react-hot-toast';
import { Trash2, Pause, Play } from 'lucide-react';
import { CategoryIcon } from '@/components/atoms/category-icon';
import { useCategories } from '@/hooks/use-transactions';
import { useToggleRecurring, useDeleteRecurring } from '@/hooks/use-recurring';
import { formatCurrency } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { RecurringTransaction, Frequency } from '@/types/transaction';

const FREQUENCY_LABELS: Record<Frequency, string> = {
  DAILY: 'Diario',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
  YEARLY: 'Anual',
};

interface RecurringListProps {
  items: RecurringTransaction[];
  onAddFirst: () => void;
}

export function RecurringList({ items, onAddFirst }: RecurringListProps) {
  const { data: categories = [] } = useCategories();
  const { mutate: toggle } = useToggleRecurring();
  const { mutate: remove } = useDeleteRecurring();

  function getCategory(categoryId: string) {
    return categories.find((c) => c.id === categoryId);
  }

  function handleToggle(id: string) {
    toggle(id, {
      onSuccess: (data) => {
        toast.success(data.isActive ? 'Activado' : 'Pausado');
      },
      onError: () => toast.error('Error al cambiar estado'),
    });
  }

  function handleDelete(id: string) {
    if (!confirm('Eliminar este gasto recurrente?')) return;
    remove(id, {
      onSuccess: () => toast.success('Eliminado'),
      onError: () => toast.error('Error al eliminar'),
    });
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-2">No hay gastos recurrentes</p>
        <button onClick={onAddFirst} className="text-sm text-primary-500 font-medium">
          Crear el primero
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const cat = getCategory(item.categoryId);
        const nextDate = new Date(item.nextExecution).toLocaleDateString('es-ES', {
          day: 'numeric',
          month: 'short',
        });

        return (
          <div
            key={item.id}
            className={cn(
              'flex items-center justify-between p-3 rounded-xl bg-card border border-border',
              !item.isActive && 'opacity-50',
            )}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <CategoryIcon
                icon={cat?.icon || 'circle-ellipsis'}
                color={cat?.color || '#888'}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {item.description || cat?.name || 'Sin nombre'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {FREQUENCY_LABELS[item.frequency]} · Prox: {nextDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-semibold text-foreground">
                {formatCurrency(Number(item.amount), item.currency)}
              </span>
              <button
                onClick={() => handleToggle(item.id)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                aria-label={item.isActive ? 'Pausar' : 'Activar'}
              >
                {item.isActive ? (
                  <Pause className="size-4 text-muted-foreground" />
                ) : (
                  <Play className="size-4 text-primary-500" />
                )}
              </button>
              <button
                onClick={() => handleDelete(item.id)}
                className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
                aria-label="Eliminar"
              >
                <Trash2 className="size-4 text-destructive" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
