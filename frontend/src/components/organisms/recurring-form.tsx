import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/atoms/field-error';
import { CategoryIcon } from '@/components/atoms/category-icon';
import { useCategories } from '@/hooks/use-transactions';
import { useCreateRecurring } from '@/hooks/use-recurring';
import { useAuthStore } from '@/stores/auth.store';
import { sanitizeAmount } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { Frequency } from '@/types/transaction';

const FREQUENCIES: { value: Frequency; label: string }[] = [
  { value: 'DAILY', label: 'Diario' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensual' },
  { value: 'YEARLY', label: 'Anual' },
];

const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD' },
  { code: 'EUR', symbol: '\u20AC', label: 'EUR' },
  { code: 'ARS', symbol: '$', label: 'ARS' },
  { code: 'MXN', symbol: '$', label: 'MXN' },
  { code: 'COP', symbol: '$', label: 'COP' },
  { code: 'CLP', symbol: '$', label: 'CLP' },
  { code: 'PEN', symbol: 'S/', label: 'PEN' },
  { code: 'BRL', symbol: 'R$', label: 'BRL' },
  { code: 'GBP', symbol: '\u00A3', label: 'GBP' },
];

interface RecurringFormProps {
  onSuccess?: () => void;
}

interface FieldErrors {
  amount?: string[];
}

function validate(amount: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!amount.trim()) errors.amount = ['El monto es requerido'];
  else if (Number(amount) <= 0) errors.amount = ['El monto debe ser mayor a cero'];
  return errors;
}

export function RecurringForm({ onSuccess }: RecurringFormProps) {
  const user = useAuthStore((s) => s.user);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(user?.primaryCurrency || 'USD');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [frequency, setFrequency] = useState<Frequency>('MONTHLY');
  const [nextExecution, setNextExecution] = useState(() => new Date().toISOString().slice(0, 10));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: categories = [], isLoading: loadingCategories } = useCategories('EXPENSE');
  const { mutateAsync: create, isPending } = useCreateRecurring();

  function handleAmountChange(value: string) {
    const sanitized = sanitizeAmount(value);
    setAmount(sanitized);
    if (submitted) setFieldErrors(validate(sanitized));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);

    const errors = validate(amount);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (!categoryId) {
      toast.error('Selecciona una categoria');
      return;
    }

    try {
      await create({
        amount: Number(amount),
        currency,
        categoryId,
        description: description.trim() || undefined,
        frequency,
        nextExecution: new Date(nextExecution + 'T12:00:00Z').toISOString(),
      });
      toast.success('Gasto recurrente creado');
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar';
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Amount + Currency */}
      <div className="space-y-2">
        <Label htmlFor="rec-amount">Monto</Label>
        <div className="flex gap-2">
          <Input
            id="rec-amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className={cn(
              'h-11 text-lg font-semibold flex-1',
              fieldErrors.amount && 'border-destructive',
            )}
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="h-11 px-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} {c.label}
              </option>
            ))}
          </select>
        </div>
        <FieldError messages={fieldErrors.amount} />
      </div>

      {/* Frequency */}
      <div className="space-y-2">
        <Label>Frecuencia</Label>
        <div className="grid grid-cols-4 gap-2">
          {FREQUENCIES.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFrequency(f.value)}
              className={cn(
                'py-2 text-xs font-medium rounded-lg border-2 transition-colors',
                frequency === f.value
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category grid */}
      <div className="space-y-2">
        <Label>Categoria</Label>
        {loadingCategories ? (
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-colors',
                  categoryId === cat.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-transparent bg-muted/50 hover:bg-muted',
                )}
              >
                <CategoryIcon icon={cat.icon} color={cat.color} size="sm" />
                <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="rec-desc">Descripcion (opcional)</Label>
        <Input
          id="rec-desc"
          type="text"
          placeholder="Ej: Netflix, Spotify"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          className="h-11"
        />
      </div>

      {/* Next execution */}
      <div className="space-y-2">
        <Label htmlFor="rec-date">Proxima ejecucion</Label>
        <Input
          id="rec-date"
          type="date"
          value={nextExecution}
          onChange={(e) => setNextExecution(e.target.value)}
          className="h-11"
        />
      </div>

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
        ) : (
          'Crear gasto recurrente'
        )}
      </Button>
    </form>
  );
}
