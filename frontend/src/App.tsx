import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LoginPage } from '@/components/pages/login-page';
import { RegisterPage } from '@/components/pages/register-page';
import { DashboardPage } from '@/components/pages/dashboard-page';
import { CategoriesPage } from '@/components/pages/categories-page';
import { RecurringPage } from '@/components/pages/recurring-page';
import { SavingsPage } from '@/components/pages/savings-page';
import { ReportsPage } from '@/components/pages/reports-page';
import { SettingsPage } from '@/components/pages/settings-page';
import { ProtectedRoute } from '@/components/templates/protected-route';
import { GuestRoute } from '@/components/templates/guest-route';
import { OfflineIndicator } from '@/components/atoms/offline-indicator';
import { InstallPrompt } from '@/components/molecules/install-prompt';
import { useAuthInit } from '@/hooks/use-auth-init';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  const { isReady } = useAuthInit();

  if (!isReady) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 border-3 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <OfflineIndicator />
      <Routes>
        {/* Guest routes (redirect to / if authenticated) */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Protected routes (redirect to /login if not authenticated) */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
          <Route path="/savings" element={<SavingsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <InstallPrompt />
    </>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '14px',
            background: 'var(--card)',
            color: 'var(--card-foreground)',
            border: '1px solid var(--border)',
          },
        }}
      />
    </QueryClientProvider>
  );
}
