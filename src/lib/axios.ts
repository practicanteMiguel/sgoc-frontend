import axios, { type AxiosRequestConfig } from "axios";
import { getAuthState } from "@/src/stores/auth.store";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
  withCredentials: true,
});


const NO_REFRESH_ROUTES = [
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/auth/verify-email",
];

// Reads directly from localStorage to handle calls before Zustand rehydrates
function getStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return null;
    const { state } = JSON.parse(raw);
    return state?.accessToken ?? null;
  } catch {
    return null;
  }
}

// ── Interceptor REQUEST — inyecta el Bearer token y API key ───
api.interceptors.request.use(
  (config) => {
    const access = getStoredAccessToken();
    if (access) {
      config.headers.Authorization = `Bearer ${access}`;
    }
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    if (apiKey) {
      config.headers['X-Api-Key'] = apiKey;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Cola para requests que esperan mientras se refresca ────────
let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}[] = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

// ── Interceptor RESPONSE — maneja 401 y refresca token ─────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const url = original?.url ?? "";

    const isAuthRoute = NO_REFRESH_ROUTES.some((route) => url.includes(route));
    if (isAuthRoute) {
      return Promise.reject(error);
    }

    if (status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        original.headers = {
          ...original.headers,
          Authorization: `Bearer ${token}`,
        };
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );

      const newToken = data.access_token;
      getAuthState().setAccessToken(newToken);
      processQueue(null, newToken);

      original.headers = {
        ...original.headers,
        Authorization: `Bearer ${newToken}`,
      };
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      getAuthState().clearAuth();
      if (typeof window !== "undefined") {
        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/auth/login?returnUrl=${returnUrl}`;
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
