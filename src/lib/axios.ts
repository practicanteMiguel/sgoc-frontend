import axios, { type AxiosRequestConfig } from "axios";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});


const NO_REFRESH_ROUTES = [
  "/auth/login",
  "/auth/refresh",
  "/auth/logout",
  "/auth/verify-email",
];


function getStoredTokens(): { access: string | null; refresh: string | null } {
  if (typeof window === "undefined") return { access: null, refresh: null };
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return { access: null, refresh: null };
    const { state } = JSON.parse(raw);
    return {
      access: state?.accessToken ?? null,
      refresh: state?.refreshToken ?? null,
    };
  } catch {
    return { access: null, refresh: null };
  }
}

function updateStoredAccessToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.state.accessToken = token;
    localStorage.setItem("auth-storage", JSON.stringify(parsed));
  } catch {}
}

function clearStoredAuth() {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.state.accessToken = null;
    parsed.state.refreshToken = null;
    parsed.state.user = null;
    parsed.state.isAuthenticated = false;
    localStorage.setItem("auth-storage", JSON.stringify(parsed));
  } catch {}
}

// ── Interceptor REQUEST — inyecta el Bearer token ──────────────
api.interceptors.request.use(
  (config) => {
    const { access } = getStoredTokens();

    if (access) {
      config.headers.Authorization = `Bearer ${access}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Cola para requests que esperan mientras se refresca ────────
let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (err: any) => void;
}[] = [];

function processQueue(error: any, token: string | null = null) {
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

    const { refresh } = getStoredTokens();

    if (!refresh) {
      isRefreshing = false;
      processQueue(error, null);
      clearStoredAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
        refresh_token: refresh,
      });

      const newToken = data.access_token;
      updateStoredAccessToken(newToken);
      processQueue(null, newToken);

      original.headers = {
        ...original.headers,
        Authorization: `Bearer ${newToken}`,
      };
      return api(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearStoredAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
