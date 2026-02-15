import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/atoms/field-error';
import { useCreateSavings } from '@/hooks/use-savings';
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

interface AddSavingsFormProps {
  onSuccess?: () => void;
}

interface FieldErrors {
  name?: string[];
  targetAmount?: string[];
}

function validate(name: string, targetAmount: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!name.trim()) errors.name = ['El nombre es requerido'];
  if (!targetAmount.trim()) errors.targetAmount = ['La meta es requerida'];
  else if (Number(targetAmount) <= 0) errors.targetAmount = ['La meta debe ser mayor a cero'];
  return errors;
}

export function AddSavingsForm({ onSuccess }: AddSavingsFormProps) {
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currency, setCurrency] = useState(user?.primaryCurrency || 'USD');
  const [deadline, setDeadline] = useState('');
  const [deductFromBalance, setDeductFromBalance] = useState(true);
  const [defaultAccountId, setDefaultAccountId] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const { mutateAsync: create, isPending } = useCreateSavings();
  const { data: accounts = [] } = useAccounts();
  const matchingAccounts = accounts.filter((a) => a.currency === currency);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);

    const errors = validate(name, targetAmount);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      await create({
        name: name.trim(),
        targetAmount: Number(targetAmount),
        currency,
        deadline: deadline ? new Date(deadline + 'T23:59:59Z').toISOString() : undefined,
        deductFromBalance,
        defaultAccountId: defaultAccountId || undefined,
      });
      toast.success('Meta de ahorro creada');
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al guardar';
      toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="sav-name">Nombre de la meta</Label>
        <Input
          id="sav-name"
          type="text"
          placeholder="Ej: Vacaciones, Fondo emergencia"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (submitted) setFieldErrors(validate(e.target.value, targetAmount));
          }}
          maxLength={100}
          className={cn('h-11', fieldErrors.name && 'border-destructive')}
        />
        <FieldError messages={fieldErrors.name} />
      </div>

      {/* Target amount + Currency */}
      <div className="space-y-2">
        <Label htmlFor="sav-amount">Meta</Label>
        <div className="flex gap-2">
          <Input
            id="sav-amount"
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={targetAmount}
            onChange={(e) => {
              const sanitized = sanitizeAmount(e.target.value);
              setTargetAmount(sanitized);
              if (submitted) setFieldErrors(validate(name, sanitized));
            }}
            className={cn(
              'h-11 text-lg font-semibold flex-1',
              fieldErrors.targetAmount && 'border-destructive',
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
        <FieldError messages={fieldErrors.targetAmount} />
      </div>

      {/* Deadline */}
      <div className="space-y-2">
        <Label htmlFor="sav-deadline">Fecha limite (opcional)</Label>
        <Input
          id="sav-deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          className="h-11"
        />
      </div>

      {/* Deduct from balance toggle */}
      <div className="flex items-center justify-between rounded-xl border border-border p-3">
        <div className="flex-1 mr-3">
          <p className="text-sm font-medium text-foreground">Deducir del balance</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Si esta activado, el dinero ahorrado se resta de tu balance disponible
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={deductFromBalance}
          onClick={() => setDeductFromBalance(!deductFromBalance)}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
            deductFromBalance ? 'bg-primary-500' : 'bg-muted',
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm transition-transform',
              deductFromBalance ? 'translate-x-5' : 'translate-x-0',
            )}
          />
        </button>
      </div>

      {/* Default account selector (only when deductFromBalance is on and accounts exist) */}
      {deductFromBalance && matchingAccounts.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="sav-default-account">Cuenta por defecto (opcional)</Label>
          <select
            id="sav-default-account"
            value={defaultAccountId}
            onChange={(e) => setDefaultAccountId(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Seleccionar cada vez</option>
            {matchingAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon ? `${a.icon} ` : ''}
                {a.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Se usara esta cuenta para deducir los depositos
          </p>
        </div>
      )}

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
          'Crear meta de ahorro'
        )}
      </Button>
    </form>
  );
}
