import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CategoryCard } from '@/components/molecules/category-card';
import { AddCategoryForm } from '@/components/organisms/add-category-form';
import { useCategories, useDeleteCategory } from '@/hooks/use-transactions';
import { cn } from '@/lib/utils';
import type { Category } from '@/types/transaction';

export function CategoriesPage() {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);

  const { data: categories = [], isLoading } = useCategories(typeFilter);
  const { mutate: deleteCategory } = useDeleteCategory();

  function handleEdit(category: Category) {
    setEditCategory(category);
    setShowForm(true);
  }

  function handleDelete(category: Category) {
    if (!confirm(`Eliminar "${category.name}"?`)) return;

    deleteCategory(category.id, {
      onSuccess: () => toast.success('Categoria eliminada'),
      onError: (error) => {
        const message = error instanceof Error ? error.message : 'Error al eliminar';
        toast.error(message);
      },
    });
  }

  function handleFormClose() {
    setShowForm(false);
    setEditCategory(null);
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-md px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Volver">
            <ArrowLeft className="size-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Categorias</h1>
        </div>

        {/* Type toggle */}
        <div className="flex gap-2 p-1 bg-muted rounded-xl mb-6">
          <button
            onClick={() => setTypeFilter('EXPENSE')}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
              typeFilter === 'EXPENSE'
                ? 'bg-expense text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Gastos
          </button>
          <button
            onClick={() => setTypeFilter('INCOME')}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
              typeFilter === 'INCOME'
                ? 'bg-income text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Ingresos
          </button>
        </div>

        {/* Category list */}
        <div className="space-y-2" role="list" aria-label="Categorias">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" role="listitem" />
            ))
          ) : categories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay categorias</p>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} role="listitem">
                <CategoryCard category={cat} onEdit={handleEdit} onDelete={handleDelete} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => {
          setEditCategory(null);
          setShowForm(true);
        }}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40 size-14 rounded-full bg-primary-500 hover:bg-primary-600 text-white shadow-lg flex items-center justify-center transition-colors"
        aria-label="Agregar categoria"
      >
        <Plus className="size-6" />
      </button>

      {/* Add/Edit dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) handleFormClose();
        }}
      >
        <DialogContent className="max-w-md mx-auto max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editCategory ? 'Editar categoria' : 'Nueva categoria'}</DialogTitle>
          </DialogHeader>
          <AddCategoryForm editCategory={editCategory} onSuccess={handleFormClose} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
