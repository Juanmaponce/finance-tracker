import { Pencil, Trash2 } from 'lucide-react';
import { CategoryIcon } from '@/components/atoms/category-icon';
import type { Category } from '@/types/transaction';

interface CategoryCardProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-card border border-border">
      <div className="flex items-center gap-3">
        <CategoryIcon icon={category.icon} color={category.color} />
        <div>
          <p className="text-sm font-medium text-foreground">{category.name}</p>
          <p className="text-xs text-muted-foreground">
            {category.type === 'EXPENSE' ? 'Gasto' : 'Ingreso'}
            {category.isDefault && ' · Por defecto'}
          </p>
        </div>
      </div>

      {!category.isDefault && (
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(category)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label={`Editar ${category.name}`}
          >
            <Pencil className="size-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => onDelete(category)}
            className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
            aria-label={`Eliminar ${category.name}`}
          >
            <Trash2 className="size-4 text-destructive" />
          </button>
        </div>
      )}
    </div>
  );
}
