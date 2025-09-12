import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// Token interface
export interface Tokens {
  access: string;
  refresh: string;
}

// Token storage utilities
class TokenStorage {
  private readonly ACCESS_TOKEN_KEY = 'vendora_access_token';
  private readonly REFRESH_TOKEN_KEY = 'vendora_refresh_token';

  set(tokens: Tokens): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.access);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, tokens.refresh);
  }

  get(): Tokens | null {
    const access = localStorage.getItem(this.ACCESS_TOKEN_KEY);
    const refresh = localStorage.getItem(this.REFRESH_TOKEN_KEY);
    
    if (access && refresh) {
      return { access, refresh };
    }
    
    return null;
  }

  clear(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }
}

export const tokenStore = new TokenStorage();

// Create axios instance
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Single-flight refresh management
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;
const pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

function processQueue(error: any, token: string | null) {
  while (pendingQueue.length) {
    const { resolve, reject } = pendingQueue.shift()!;
    if (error) reject(error);
    else if (token) resolve(token);
    else reject(new Error('No token available'));
  }
}

// Request interceptor to add auth token
http.interceptors.request.use(
  (config) => {
    const token = tokenStore.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
http.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error) => {
    const originalRequest: AxiosRequestConfig & { _retry?: boolean } = error.config || {};

    // If token is expired and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = tokenStore.getRefreshToken();
      if (!refreshToken) {
        tokenStore.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue the request until refresh completes
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (newAccess: string) => {
              if (!originalRequest.headers) originalRequest.headers = {};
              (originalRequest.headers as any).Authorization = `Bearer ${newAccess}`;
              resolve(http(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;
      const baseURL = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';
      refreshPromise = axios
        .post(`${baseURL}/api/v1/accounts/token/refresh/`, { refresh: refreshToken })
        .then((refreshResponse) => {
          const newAccess = refreshResponse.data.access as string;
          tokenStore.set({ access: newAccess, refresh: refreshToken });
          processQueue(null, newAccess);
          return newAccess;
        })
        .catch((refreshError) => {
          processQueue(refreshError, null);
          tokenStore.clear();
          window.location.href = '/login';
          throw refreshError;
        })
        .finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });

      try {
        const newAccess = await refreshPromise;
        if (!originalRequest.headers) originalRequest.headers = {};
        (originalRequest.headers as any).Authorization = `Bearer ${newAccess}`;
        return http(originalRequest);
      } catch (e) {
        return Promise.reject(e);
      }
    }

    return Promise.reject(error);
  }
);

export { http };
export default http;