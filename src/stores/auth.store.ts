import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { type AuthUser } from '../types/auth.types';

interface AuthState {
  // Estado
  user:         AuthUser | null;
  accessToken:  string | null;
  refreshToken: string | null;
  theme:        'light' | 'dark';
  isAuthenticated: boolean;

  // Acciones
  setAuth:      (user: AuthUser, accessToken: string, refreshToken: string) => void;
  clearAuth:    () => void;
  setTheme:     (theme: 'light' | 'dark') => void;
  toggleTheme:  () => void;
  updateUser:   (user: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:            null,
      accessToken:     null,
      refreshToken:    null,
      theme:           'light',
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      clearAuth: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),

      setTheme: (theme) => set({ theme }),

      toggleTheme: () =>
        set({ theme: get().theme === 'light' ? 'dark' : 'light' }),

      updateUser: (partial) =>
        set({ user: get().user ? { ...get().user!, ...partial } : null }),
    }),
    {
      name:    'auth-storage', // clave en localStorage — la usa axios.ts
      partialize: (state) => ({
        user:         state.user,
        accessToken:  state.accessToken,
        refreshToken: state.refreshToken,
        theme:        state.theme,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);