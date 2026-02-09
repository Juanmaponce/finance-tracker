import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/atoms/field-error';
import { IconPicker } from '@/components/molecules/icon-picker';
import { ColorPicker } from '@/components/molecules/color-picker';
import { useCreateCategory, useUpdateCategory } from '@/hooks/use-transactions';
import { cn } from '@/lib/utils';
import type { Category } from '@/types/transaction';

interface AddCategoryFormProps {
  editCategory?: Category | null;
  onSuccess?: () => void;
}

interface FieldErrors {
  name?: string[];
}

function validate(name: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!name.trim()) errors.name = ['El nombre es requerido'];
  else if (name.length > 50) errors.name = ['Maximo 50 caracteres'];
  return errors;
}

export function AddCategoryForm({ editCategory, onSuccess }: AddCategoryFormProps) {
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('tag');
  const [color, setColor] = useState('#3B82F6');
  const [keywords, setKeywords] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const { mutateAsync: create, isPending: creating } = useCreateCategory();
  const { mutateAsync: update, isPending: updating } = useUpdateCategory();
  const isPending = creating || updating;

  useEffect(() => {
    if (editCategory) {
      setType(editCategory.type);
      setName(editCategory.name);
      setIcon(editCategory.icon);
      setColor(editCategory.color);
      setKeywords(editCategory.keywords.join(', '));
    }
  }, [editCategory]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);

    const errors = validate(name);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const keywordArray = keywords
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    try {
      if (editCategory) {
        await update({
          id: editCategory.id,
          data: { name: name.trim(), icon, color, keywords: keywordArray },
        });
        toast.success('Categoria actualizada');
      } else {
        await create({
          name: name.trim(),
          icon,
          color,
          type,
          keywords: keywordArray,
        });
        toast.success('Categoria creada');
      }
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar';
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type toggle (only for new categories) */}
      {!editCategory && (
        <div className="flex gap-2 p-1 bg-muted rounded-xl">
          <button
            type="button"
            onClick={() => setType('EXPENSE')}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
              type === 'EXPENSE'
                ? 'bg-expense text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Gasto
          </button>
          <button
            type="button"
            onClick={() => setType('INCOME')}
            className={cn(
              'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
              type === 'INCOME'
                ? 'bg-income text-white shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Ingreso
          </button>
        </div>
      )}

      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="cat-name">Nombre</Label>
        <Input
          id="cat-name"
          type="text"
          placeholder="Ej: Supermercado"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (submitted) setFieldErrors(validate(e.target.value));
          }}
          maxLength={50}
          className={cn('h-11', fieldErrors.name && 'border-destructive')}
          aria-invalid={!!fieldErrors.name}
        />
        <FieldError messages={fieldErrors.name} />
      </div>

      {/* Color picker */}
      <div className="space-y-2">
        <Label>Color</Label>
        <ColorPicker value={color} onChange={setColor} />
      </div>

      {/* Icon picker */}
      <div className="space-y-2">
        <Label>Icono</Label>
        <IconPicker value={icon} color={color} onChange={setIcon} />
      </div>

      {/* Keywords */}
      <div className="space-y-2">
        <Label htmlFor="cat-keywords">Palabras clave (opcional)</Label>
        <Input
          id="cat-keywords"
          type="text"
          placeholder="uber, taxi, bus (separadas por coma)"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          className="h-11"
        />
        <p className="text-xs text-muted-foreground">Se usan para auto-categorizar transacciones</p>
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-11 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium"
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Guardando...
          </span>
        ) : editCategory ? (
          'Guardar cambios'
        ) : (
          'Crear categoria'
        )}
      </Button>
    </form>
  );
}
