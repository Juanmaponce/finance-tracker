import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';

function applyDarkMode(enabled: boolean) {
  document.documentElement.classList.toggle('dark', enabled);
}

/**
 * Validates persisted auth state on app startup.
 * If tokens are stored but invalid/expired, clears auth and redirects to login.
 * Also applies dark mode preference from user settings.
 */
export function useAuthInit() {
  const [isReady, setIsReady] = useState(false);
  const { isAuthenticated, user, loadProfile, clearAuth } = useAuthStore();

  // Apply dark mode whenever user changes
  useEffect(() => {
    if (user) {
      applyDarkMode(user.darkMode);
    }
  }, [user?.darkMode]);

  useEffect(() => {
    async function validateAuth() {
      if (isAuthenticated) {
        try {
          await loadProfile();
        } catch {
          clearAuth();
        }
      }
      setIsReady(true);
    }

    validateAuth();
  }, []);

  return { isReady };
}
