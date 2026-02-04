import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { store } from '../app/store';
import { clearAuth, setCredentials } from '../features/auth/authSlice';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';
const baseURL = rawBaseUrl.replace(/\/$/, '');

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = store.getState().auth.accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

const refreshToken = async (): Promise<string | null> => {
  try {
    const response = await api.post('/api/auth/refresh');
    const { token, user } = response.data;
    if (token?.accessToken && user) {
      store.dispatch(setCredentials({ accessToken: token.accessToken, user }));
      return token.accessToken;
    }
    return null;
  } catch {
    store.dispatch(clearAuth());
    return null;
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !originalRequest?._retry) {
      originalRequest._retry = true;
      if (!refreshPromise) {
        refreshPromise = refreshToken().finally(() => {
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
