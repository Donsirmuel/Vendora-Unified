import { http, tokenStore, Tokens } from './http';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  name: string;
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
    name: string;
  };
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
    const response = await http.post<LoginResponse>('/api/v1/accounts/token/', {
      email: credentials.email,  // Backend expects 'email' field
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
    const message = error.response?.data?.detail || 
                   Object.values(error.response?.data || {}).flat().join(', ') ||
                   'Login failed';
    throw new Error(message);
  }
}

export async function signup(credentials: SignupCredentials): Promise<SignupResponse> {
  try {
    const response = await http.post<SignupResponse>('/api/v1/accounts/signup/', credentials);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 
                   Object.values(error.response?.data || {}).flat().join(', ') ||
                   'Signup failed';
    throw new Error(message);
  }
}

export async function requestPasswordReset(data: PasswordResetRequest): Promise<{message: string}> {
  try {
    const response = await http.post('/api/v1/accounts/password-reset/', data);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to send reset email';
    throw new Error(message);
  }
}

export async function confirmPasswordReset(data: PasswordResetConfirm): Promise<{message: string}> {
  try {
    const response = await http.post('/api/v1/accounts/password-reset/confirm/', data);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to reset password';
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