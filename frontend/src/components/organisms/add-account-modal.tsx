import { useState } from 'react';
import toast from 'react-hot-toast';
import { Wallet, CreditCard, Banknote } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCreateAccount } from '@/hooks/use-accounts';
import { cn } from '@/lib/utils';

const ICONS = [
  { value: 'wallet', label: 'Billetera', Icon: Wallet },
  { value: 'credit-card', label: 'Tarjeta', Icon: CreditCard },
  { value: 'banknote', label: 'Efectivo', Icon: Banknote },
] as const;

const CURRENCIES = ['USD', 'EUR', 'ARS', 'MXN', 'COP', 'CLP', 'PEN', 'BRL', 'GBP'];

const COLORS = [
  '#00B9AE',
  '#6C5CE7',
  '#FF6B6B',
  '#4ECDC4',
  '#FD79A8',
  '#FDCB6E',
  '#00D2D3',
  '#A29BFE',
];

interface AddAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAccountModal({ open, onOpenChange }: AddAccountModalProps) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [icon, setIcon] = useState('wallet');
  const [color, setColor] = useState('#00B9AE');

  const { mutateAsync: createAccount, isPending } = useCreateAccount();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('El nombre es requerido');
      return;
    }

    try {
      await createAccount({ name: name.trim(), currency, icon, color });
      toast.success('Cuenta creada');
      setName('');
      setCurrency('USD');
      setIcon('wallet');
      setColor('#00B9AE');
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al crear cuenta';
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle>Agregar cuenta</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="account-name">Nombre de la cuenta</Label>
            <Input
              id="account-name"
              placeholder="Ej: Cuenta USD, Efectivo EUR"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="h-11"
            />
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <Label htmlFor="account-currency">Moneda</Label>
            <select
              id="account-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {CURRENCIES.map((curr) => (
                <option key={curr} value={curr} className="bg-card text-card-foreground">
                  {curr}
                </option>
              ))}
            </select>
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <Label>Icono</Label>
            <div className="grid grid-cols-3 gap-2">
              {ICONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setIcon(value)}
                  className={cn(
                    'p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-colors',
                    icon === value
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-border hover:bg-muted/50',
                  )}
                >
                  <Icon className="size-5 text-foreground" />
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'h-10 rounded-xl border-2 transition-all',
                    color === c
                      ? 'border-foreground scale-105'
                      : 'border-transparent hover:scale-105',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 h-11 bg-primary-500 hover:bg-primary-600 text-white rounded-xl"
            >
              {isPending ? 'Creando...' : 'Crear cuenta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
