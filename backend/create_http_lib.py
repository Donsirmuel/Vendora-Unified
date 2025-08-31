#!/usr/bin/env python3

import os

# HTTP utilities for React frontend
http_content = '''import axios, { AxiosResponse } from 'axios';

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
  baseURL: 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
    const originalRequest = error.config;

    // If token is expired and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = tokenStore.getRefreshToken();
      if (refreshToken) {
        try {
          const refreshResponse = await axios.post('http://localhost:8000/api/v1/accounts/token/refresh/', {
            refresh: refreshToken,
          });

          const newTokens = {
            access: refreshResponse.data.access,
            refresh: refreshToken, // Keep the same refresh token
          };

          tokenStore.set(newTokens);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
          return http(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          tokenStore.clear();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
        tokenStore.clear();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export { http };
export default http;'''

# Write the file
http_path = "../trade-lane-pro/src/lib/http.ts"
try:
    os.makedirs(os.path.dirname(http_path), exist_ok=True)
    with open(http_path, 'w', encoding='utf-8') as f:
        f.write(http_content)
    print(f"✅ Created {http_path}")
    print("✅ HTTP utilities created with:")
    print("   - Axios configuration")
    print("   - Token storage management")
    print("   - Automatic token refresh")
    print("   - Request/response interceptors")
except Exception as e:
    print(f"❌ Error creating HTTP utilities: {e}")
