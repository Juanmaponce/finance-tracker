import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RecurringList } from '@/components/organisms/recurring-list';
import { RecurringForm } from '@/components/organisms/recurring-form';
import { useRecurring } from '@/hooks/use-recurring';

export function RecurringPage() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);

  const { data: items = [], isLoading } = useRecurring();

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-md px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Volver">
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Gastos recurrentes</h1>
        </div>

        {/* Summary */}
        {items.length > 0 && (
          <div className="rounded-xl bg-muted/50 p-4 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Activos</span>
              <span className="font-medium text-foreground">
                {items.filter((i) => i.isActive).length} de {items.length}
              </span>
            </div>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <RecurringList items={items} onAddFirst={() => setShowForm(true)} />
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-6 right-6 z-40 size-14 rounded-full bg-primary-500 hover:bg-primary-600 text-white shadow-lg flex items-center justify-center transition-colors"
        aria-label="Agregar recurrente"
      >
        <Plus className="size-6" />
      </button>

      {/* Form dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md mx-auto max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo gasto recurrente</DialogTitle>
          </DialogHeader>
          <RecurringForm onSuccess={() => setShowForm(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
