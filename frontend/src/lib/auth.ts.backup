import { http, tokenStore, Tokens } from './http';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface VendorProfile {
  id: number;
  email: string;
  name: string;
  bank_details: string;
  is_available: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  try {
    const response = await http.post<LoginResponse>('/api/v1/accounts/token/', credentials);
    const tokens = response.data;
    
    // Store tokens
    tokenStore.set(tokens);
    
    return tokens;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Login failed';
    throw new Error(message);
  }
}

export function logout(): void {
  tokenStore.clear();
  window.location.href = '/';
}

export function isAuthenticated(): boolean {
  return !!tokenStore.get()?.access;
}

export function getAccessToken(): string | null {
  return tokenStore.get()?.access || null;
}

export async function getVendorProfile(): Promise<VendorProfile> {
  try {
    const response = await http.get<VendorProfile>('/api/v1/accounts/vendors/me/');
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to fetch profile';
    throw new Error(message);
  }
}

export async function updateVendorProfile(updates: Partial<VendorProfile>): Promise<VendorProfile> {
  try {
    const response = await http.patch<VendorProfile>('/api/v1/accounts/vendors/me/', updates);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to update profile';
    throw new Error(message);
  }
}
