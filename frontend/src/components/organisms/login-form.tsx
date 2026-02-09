import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn } from 'lucide-react';
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

interface LoginFormProps {
  className?: string;
}

interface FieldErrors {
  email?: string[];
  password?: string[];
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};

  const emailErrors: string[] = [];
  if (!email.trim()) emailErrors.push('El email es requerido');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    emailErrors.push('Ingresa un email valido');
  if (emailErrors.length) errors.email = emailErrors;

  const pwErrors: string[] = [];
  if (!password) pwErrors.push('La contrasena es requerida');
  if (pwErrors.length) errors.password = pwErrors;

  return errors;
}

function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function LoginForm({ className }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  function handleChange<T extends keyof FieldErrors>(
    field: T,
    value: string,
    setter: (v: string) => void,
  ) {
    setter(value);
    if (submitted) {
      const values = { email, password, [field]: value };
      setFieldErrors(validate(values.email, values.password));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);

    const errors = validate(email, password);
    setFieldErrors(errors);

    if (hasErrors(errors)) return;

    try {
      await login(email.trim().toLowerCase(), password);
      toast.success('Bienvenido de vuelta!');
      navigate('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al iniciar sesion';
      toast.error(message);
    }
  }

  return (
    <Card className={cn('w-full max-w-sm border-0 shadow-lg', className)}>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Iniciar sesion</CardTitle>
        <CardDescription>Ingresa tus credenciales para continuar</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
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
            <Label htmlFor="password">Contrasena</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Tu contrasena"
                value={password}
                onChange={(e) => handleChange('password', e.target.value, setPassword)}
                autoComplete="current-password"
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
                Ingresando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn className="size-4" />
                Ingresar
              </span>
            )}
          </Button>
          <p className="text-sm text-center text-muted-foreground">
            No tienes cuenta?{' '}
            <Link to="/register" className="text-primary-500 hover:text-primary-600 font-medium">
              Registrate
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
