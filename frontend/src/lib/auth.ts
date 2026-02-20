import { http, tokenStore, Tokens } from './http';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  username: string;
  password: string;
  password_confirm: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user?: {
    id: number;
    email: string;
    name: string;
    is_available: boolean;
  };
}

export interface SignupResponse {
  message: string;
  user: {
    id: number;
    email: string;
    name?: string;
    // Trial fields returned by backend signup endpoint
    is_trial?: boolean;
    trial_expires_at?: string | null;
  };
}

export interface SubscriptionStatus {
  active: boolean;
  plan: 'trial' | 'none' | 'monthly' | 'quarterly' | 'semi-annual' | 'yearly' | 'perpetual';
  is_trial: boolean;
  trial_expires_at?: string | null;
  plan_expires_at?: string | null;
  expired: boolean;
}

export interface VendorProfile {
  id: number;
  email: string;
  name: string;
  bank_details: string;
  auto_expire_minutes: number | null;
  is_available: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  is_active: boolean;
  // Daily order tracking for free plan limits
  daily_orders_count?: number;
  daily_order_limit?: number;
  daily_orders_date?: string;
  unavailable_message?: string | null;
  // Currency preference for displaying on PWA and bot
  currency?: string;
  // Provided by backend serializer for licensing/trial UI
  subscription_status?: SubscriptionStatus;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  uid: string;
  token: string;
  new_password: string;
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
  try {
    const email = credentials.email.trim().toLowerCase();
    const response = await http.post<LoginResponse>('/api/v1/accounts/token/', {
      email,
      password: credentials.password
    });
    const tokens = response.data;

    // Store tokens
    tokenStore.set({
      access: tokens.access,
      refresh: tokens.refresh
    });

    return tokens;
  } catch (error: any) {
    const data = error?.response?.data;
    const message = (typeof data?.detail === 'string' && data.detail) ||
                   (data?.detail && typeof data.detail !== 'string' ? JSON.stringify(data.detail) : '') ||
                   (data ? Object.values(data).flat().join(', ') : '') ||
                   'Login failed';
    const enrichedError = new Error(message) as Error & { data?: any; status?: number };
    enrichedError.data = data;
    enrichedError.status = error?.response?.status;
    throw enrichedError;
  }
}

export async function signup(credentials: SignupCredentials): Promise<SignupResponse> {
  try {
    const payload: SignupCredentials = {
      email: credentials.email.trim().toLowerCase(),
      username: credentials.username.trim(),
      password: credentials.password,
      password_confirm: credentials.password_confirm,
    };
    const response = await http.post<SignupResponse>('/api/v1/accounts/signup/', payload);
    return response.data;
  } catch (error: any) {
    const data = error?.response?.data;
    const message = (typeof data?.detail === 'string' && data.detail) ||
                   (data?.detail && typeof data.detail !== 'string' ? JSON.stringify(data.detail) : '') ||
                   (data ? Object.values(data).flat().join(', ') : '') ||
                   'Signup failed';
    throw new Error(message);
  }
}

export async function requestPasswordReset(data: PasswordResetRequest): Promise<{message: string}> {
  try {
    const response = await http.post('/api/v1/accounts/password-reset/', data);
    return response.data;
  } catch (error: any) {
    const data = error?.response?.data;
    const message = (typeof data?.detail === 'string' && data.detail) || 'Failed to send reset email';
    throw new Error(message);
  }
}

export async function confirmPasswordReset(data: PasswordResetConfirm): Promise<{message: string}> {
  try {
    const response = await http.post('/api/v1/accounts/password-reset/confirm/', data);
    return response.data;
  } catch (error: any) {
    const data = error?.response?.data;
    const message = (typeof data?.detail === 'string' && data.detail) || 'Failed to reset password';
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
    const data = error?.response?.data;
    const message = (typeof data?.detail === 'string' && data.detail) || 'Failed to fetch profile';
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

// Utility function to validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Utility function to validate password strength
export function validatePassword(password: string): { isValid: boolean; message?: string } {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/(?=.*\d)/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  
  return { isValid: true };
}

// Utility function to check if passwords match
export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}