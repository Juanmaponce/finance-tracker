import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FieldError } from '@/components/atoms/field-error';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';

const CURRENCIES = ['USD', 'EUR', 'ARS', 'MXN', 'COP', 'CLP', 'PEN', 'BRL', 'GBP'];

interface RegisterFormProps {
  className?: string;
}

interface FieldErrors {
  displayName?: string[];
  email?: string[];
  password?: string[];
  confirmPassword?: string[];
}

function validate(
  displayName: string,
  email: string,
  password: string,
  confirmPassword: string,
): FieldErrors {
  const errors: FieldErrors = {};

  // Name
  const nameErrors: string[] = [];
  if (!displayName.trim()) nameErrors.push('El nombre es requerido');
  else if (displayName.trim().length < 2) nameErrors.push('Minimo 2 caracteres');
  if (nameErrors.length) errors.displayName = nameErrors;

  // Email
  const emailErrors: string[] = [];
  if (!email.trim()) emailErrors.push('El email es requerido');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    emailErrors.push('Ingresa un email valido');
  if (emailErrors.length) errors.email = emailErrors;

  // Password — collect ALL issues at once
  const pwErrors: string[] = [];
  if (!password) {
    pwErrors.push('La contrasena es requerida');
  } else {
    if (password.length < 8) pwErrors.push('Minimo 8 caracteres');
    if (!/[A-Z]/.test(password)) pwErrors.push('Al menos una letra mayuscula');
    if (!/[0-9]/.test(password)) pwErrors.push('Al menos un numero');
  }
  if (pwErrors.length) errors.password = pwErrors;

  // Confirm
  const confirmErrors: string[] = [];
  if (!confirmPassword) confirmErrors.push('Confirma tu contrasena');
  else if (password && confirmPassword !== password)
    confirmErrors.push('Las contrasenas no coinciden');
  if (confirmErrors.length) errors.confirmPassword = confirmErrors;

  return errors;
}

function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function RegisterForm({ className }: RegisterFormProps) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  // Re-validate on change after first submit attempt
  function handleChange<T extends keyof FieldErrors>(
    field: T,
    value: string,
    setter: (v: string) => void,
  ) {
    setter(value);
    if (submitted) {
      // Re-validate all fields with the new value
      const values = { displayName, email, password, confirmPassword, [field]: value };
      setFieldErrors(
        validate(values.displayName, values.email, values.password, values.confirmPassword),
      );
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);

    const errors = validate(displayName, email, password, confirmPassword);
    setFieldErrors(errors);

    if (hasErrors(errors)) return;

    try {
      await register(email.trim().toLowerCase(), password, displayName.trim(), currency);
      toast.success('Cuenta creada exitosamente!');
      navigate('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al crear la cuenta';
      toast.error(message);
    }
  }

  return (
    <Card className={cn('w-full max-w-sm border-0 shadow-lg', className)}>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Crear cuenta</CardTitle>
        <CardDescription>Comienza a controlar tus finanzas</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              type="text"
              placeholder="Tu nombre"
              value={displayName}
              onChange={(e) => handleChange('displayName', e.target.value, setDisplayName)}
              autoComplete="name"
              className={cn('h-11', fieldErrors.displayName && 'border-destructive')}
              aria-invalid={!!fieldErrors.displayName}
            />
            <FieldError messages={fieldErrors.displayName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-email">Email</Label>
            <Input
              id="register-email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => handleChange('email', e.target.value, setEmail)}
              autoComplete="email"
              className={cn('h-11', fieldErrors.email && 'border-destructive')}
              aria-invalid={!!fieldErrors.email}
            />
            <FieldError messages={fieldErrors.email} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-password">Contrasena</Label>
            <div className="relative">
              <Input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimo 8 caracteres"
                value={password}
                onChange={(e) => handleChange('password', e.target.value, setPassword)}
                autoComplete="new-password"
                className={cn('h-11 pr-10', fieldErrors.password && 'border-destructive')}
                aria-invalid={!!fieldErrors.password}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <FieldError messages={fieldErrors.password} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar contrasena</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Repite tu contrasena"
              value={confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value, setConfirmPassword)}
              autoComplete="new-password"
              className={cn('h-11', fieldErrors.confirmPassword && 'border-destructive')}
              aria-invalid={!!fieldErrors.confirmPassword}
            />
            <FieldError messages={fieldErrors.confirmPassword} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Moneda principal</Label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c} className="bg-card text-card-foreground">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creando cuenta...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <UserPlus className="size-4" />
                Registrarse
              </span>
            )}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary-500 hover:text-primary-600 font-medium">
              Inicia sesion
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
