import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthTokens } from '@/types/auth';
import * as authService from '@/services/auth.service';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    primaryCurrency?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  loadProfile: () => Promise<void>;
  updateUser: (partial: Partial<User>) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      tokens: null,
      isLoading: false,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const result = await authService.loginUser({ email, password });
          set({
            user: result.user,
            tokens: result.tokens,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (
        email: string,
        password: string,
        displayName: string,
        primaryCurrency?: string,
      ) => {
        set({ isLoading: true });
        try {
          const result = await authService.registerUser({
            email,
            password,
            displayName,
            primaryCurrency,
          });
          set({
            user: result.user,
            tokens: result.tokens,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        const { tokens } = get();
        try {
          if (tokens?.refreshToken) {
            await authService.logoutUser(tokens.refreshToken);
          }
        } catch {
          // Logout even if API call fails
        }
        set({ user: null, tokens: null, isAuthenticated: false });
      },

      loadProfile: async () => {
        try {
          const user = await authService.getProfile();
          set({ user, isAuthenticated: true });
        } catch {
          set({ user: null, tokens: null, isAuthenticated: false });
        }
      },

      updateUser: (partial: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...partial } });
        }
      },

      clearAuth: () => {
        set({ user: null, tokens: null, isAuthenticated: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
