import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/atoms/field-error';
import { CategoryIcon } from '@/components/atoms/category-icon';
import { useCategories, useCreateTransaction } from '@/hooks/use-transactions';
import { useAccounts } from '@/hooks/use-accounts';
import { useAuthStore } from '@/stores/auth.store';
import { sanitizeAmount } from '@/utils/format';
import { cn } from '@/lib/utils';

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

interface AddTransactionFormProps {
  onSuccess?: () => void;
}

interface FieldErrors {
  amount?: string[];
  description?: string[];
}

function validate(amount: string): FieldErrors {
  const errors: FieldErrors = {};

  const amountErrors: string[] = [];
  if (!amount.trim()) amountErrors.push('El monto es requerido');
  else if (Number(amount) <= 0) amountErrors.push('El monto debe ser mayor a cero');
  else if (Number(amount) > 999999999) amountErrors.push('El monto es demasiado grande');
  if (amountErrors.length) errors.amount = amountErrors;

  return errors;
}

function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function AddTransactionForm({ onSuccess }: AddTransactionFormProps) {
  const user = useAuthStore((s) => s.user);
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(user?.primaryCurrency || 'USD');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [accountId, setAccountId] = useState<string | undefined>();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const { data: categories = [], isLoading: loadingCategories } = useCategories(type);
  const { data: accounts = [] } = useAccounts();
  const { mutateAsync: create, isPending } = useCreateTransaction();

  // Auto-select default account on first load
  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      const defaultAcc = accounts.find((a) => a.isDefault) ?? accounts[0];
      setAccountId(defaultAcc.id);
      setCurrency(defaultAcc.currency);
    }
  }, [accounts, accountId]);

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
    if (hasErrors(errors)) return;

    try {
      await create({
        amount: Number(amount),
        currency,
        type,
        categoryId,
        accountId,
        description: description.trim() || undefined,
        date: new Date(date + 'T12:00:00Z').toISOString(),
      });
      toast.success(type === 'EXPENSE' ? 'Gasto agregado' : 'Ingreso agregado');
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar';
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type toggle */}
      <div className="flex gap-2 p-1 bg-muted rounded-xl">
        <button
          type="button"
          onClick={() => {
            setType('EXPENSE');
            setCategoryId(undefined);
          }}
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
          onClick={() => {
            setType('INCOME');
            setCategoryId(undefined);
          }}
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

      {/* Account selector */}
      {accounts.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="account">Cuenta</Label>
          <select
            id="account"
            value={accountId ?? ''}
            onChange={(e) => {
              const acc = accounts.find((a) => a.id === e.target.value);
              if (acc) {
                setAccountId(acc.id);
                setCurrency(acc.currency);
              }
            }}
            className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Cuenta"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id} className="bg-card text-card-foreground">
                {acc.name} ({acc.currency})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Amount + Currency */}
      <div className="space-y-2">
        <Label htmlFor="amount">Monto</Label>
        <div className="flex gap-2">
          <Input
            id="amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            className={cn(
              'h-11 text-lg font-semibold flex-1',
              fieldErrors.amount && 'border-destructive',
            )}
            aria-invalid={!!fieldErrors.amount}
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="h-11 px-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Moneda"
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code} className="bg-card text-card-foreground">
                {c.symbol} {c.label}
              </option>
            ))}
          </select>
        </div>
        <FieldError messages={fieldErrors.amount} />
      </div>

      {/* Category grid */}
      <div className="space-y-2">
        <Label>Categoria</Label>
        {loadingCategories ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={cn(
                  'flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-colors',
                  categoryId === cat.id
                    ? 'border-primary-500 bg-primary-500/10'
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
        <Label htmlFor="description">Descripcion (opcional)</Label>
        <Input
          id="description"
          type="text"
          placeholder="Ej: Almuerzo con amigos"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={500}
          className="h-11"
        />
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">Fecha</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="h-11"
        />
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
        ) : type === 'EXPENSE' ? (
          'Agregar gasto'
        ) : (
          'Agregar ingreso'
        )}
      </Button>
    </form>
  );
}
