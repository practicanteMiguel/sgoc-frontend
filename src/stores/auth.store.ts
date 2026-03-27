import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type AuthUser } from "../types/auth.types";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  theme: "light" | "dark";
  isAuthenticated: boolean;
  _hasHydrated: boolean; // 👈 nuevo

  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setTheme: (theme: "light" | "dark") => void;
  toggleTheme: () => void;
  updateUser: (user: Partial<AuthUser>) => void;
  setAccessToken: (token: string) => void;
  setHasHydrated: (state: boolean) => void; // 👈 nuevo
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      theme: "light",
      isAuthenticated: false,
      _hasHydrated: false, // 👈

      setAuth: (user, accessToken, refreshToken) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),

      clearAuth: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set({ theme: get().theme === "light" ? "dark" : "light" }),
      updateUser: (partial) =>
        set({ user: get().user ? { ...get().user!, ...partial } : null }),
      setAccessToken: (token) => set({ accessToken: token }),
      setHasHydrated: (state) => set({ _hasHydrated: state }), // 👈
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        theme: state.theme,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true); // 👈 se dispara cuando localStorage ya cargó
      },
    },
  ),
);

export const getAuthState = () => useAuthStore.getState();