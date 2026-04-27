import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// Token interface
export interface Tokens {
  access: string;
  refresh?: string;
}

// Token storage utilities
class TokenStorage {
  private readonly ACCESS_TOKEN_KEY = 'vendora_access_token';
  private memoryTokens: Tokens | null = null;

  private readSessionToken(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private writeSessionToken(key: string, value: string): void {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // ignore storage write failures (private mode/quota/etc.)
    }
  }

  private removeSessionToken(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // ignore storage remove failures
    }
  }

  // Remove legacy persistent browser tokens if they exist from older builds.
  private clearLegacyLocalStorage(): void {
    try {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem('vendora_refresh_token');
    } catch {
      // ignore
    }
  }

  set(tokens: Tokens): void {
    this.memoryTokens = { access: tokens.access };
    this.writeSessionToken(this.ACCESS_TOKEN_KEY, tokens.access);
    this.clearLegacyLocalStorage();
  }

  get(): Tokens | null {
    if (this.memoryTokens?.access) {
      return this.memoryTokens;
    }

    const access = this.readSessionToken(this.ACCESS_TOKEN_KEY);
    
    if (access) {
      const tokens = { access };
      this.memoryTokens = tokens;
      return tokens;
    }
    
    return null;
  }

  clear(): void {
    this.memoryTokens = null;
    this.removeSessionToken(this.ACCESS_TOKEN_KEY);
    this.clearLegacyLocalStorage();
  }

  getAccessToken(): string | null {
    return this.get()?.access || null;
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
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      const headers = (config.headers || {}) as any;
      delete headers['Content-Type'];
      delete headers['content-type'];
      config.headers = headers;
    }
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
    // Global account inactive handling: backends return 403 with code 'ACCOUNT_INACTIVE'
    try {
      const resp = error.response;
      if (resp && resp.status === 403 && resp.data && resp.data.code === 'ACCOUNT_INACTIVE') {
        // Clear tokens and redirect to upgrade page with reason
        tokenStore.clear();
        const reason = 'account_inactive';
        window.location.href = `/upgrade?reason=${reason}`;
        return Promise.reject(error);
      }
    } catch (e) {
      // swallow
    }
    const originalRequest: AxiosRequestConfig & { _retry?: boolean } = error.config || {};

    // If token is expired and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

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
      const baseURL = import.meta.env.VITE_API_BASE || 'https://vendora-backend.onrender.com';
      refreshPromise = axios
        .post(`${baseURL}/api/v1/accounts/token/refresh/`, {}, { withCredentials: true })
        .then((refreshResponse) => {
          const newAccess = refreshResponse.data.access as string;
          tokenStore.set({ access: newAccess });
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