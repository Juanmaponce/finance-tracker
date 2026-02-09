import { LoginForm } from '@/components/organisms/login-form';
import { Wallet } from 'lucide-react';

export function LoginPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 bg-background">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary-500">
          <Wallet className="size-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Finance Tracker</h1>
      </div>
      <LoginForm />
    </div>
  );
}
