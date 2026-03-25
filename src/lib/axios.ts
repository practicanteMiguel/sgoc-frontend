import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api/v1";

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// ── Interceptor de REQUEST — agrega el token a cada petición ───
api.interceptors.request.use(
  (config) => {
    // Leemos el token del localStorage (lo guarda el store de Zustand)
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("auth-storage");
      if (stored) {
        try {
          const { state } = JSON.parse(stored);
          if (state?.accessToken) {
            config.headers.Authorization = `Bearer ${state.accessToken}`;
          }
        } catch {}
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Interceptor de RESPONSE — maneja expiración del token ──────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Si es 401 y no hemos reintentado ya
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const stored = localStorage.getItem("auth-storage");
        if (!stored) throw new Error("No hay sesión");

        const { state } = JSON.parse(stored);
        if (!state?.refreshToken) throw new Error("No hay refresh token");

        // Pedir nuevo access token
        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: state.refreshToken,
        });

        // Actualizar el token en el store
        const newStored = JSON.parse(
          localStorage.getItem("auth-storage") ?? "{}",
        );
        newStored.state.accessToken = data.access_token;
        localStorage.setItem("auth-storage", JSON.stringify(newStored));

        // Reintentar la petición original con el nuevo token
        original.headers = {
          ...original.headers,
          Authorization: `Bearer ${data.access_token}`,
        };
        return api(original);
      } catch {
        // Refresh falló — limpiar sesión y redirigir al login
        localStorage.removeItem("auth-storage");
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  },
);
