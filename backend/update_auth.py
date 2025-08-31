#!/usr/bin/env python3

import os

# Enhanced auth.ts content
auth_content = '''import { http, tokenStore, Tokens } from './http';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  password_confirm: string;
  name: string;
  bank_details?: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface SignupResponse {
  message: string;
  vendor: VendorProfile;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  password: string;
  password_confirm: string;
}

export interface PasswordResetResponse {
  message: string;
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
  date_joined: string;
  last_login: string | null;
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

export async function signup(credentials: SignupCredentials): Promise<SignupResponse> {
  try {
    const response = await http.post<SignupResponse>('/api/v1/accounts/signup/', credentials);
    return response.data;
  } catch (error: any) {
    // Handle validation errors
    if (error.response?.data) {
      const errorData = error.response.data;
      
      // If it's a validation error with field-specific messages
      if (typeof errorData === 'object' && !errorData.detail) {
        const firstFieldError = Object.values(errorData)[0];
        const message = Array.isArray(firstFieldError) ? firstFieldError[0] : firstFieldError;
        throw new Error(message as string);
      }
      
      // If it's a detail error message
      if (errorData.detail) {
        throw new Error(errorData.detail);
      }
      
      // If it's a non_field_errors array
      if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
        throw new Error(errorData.non_field_errors[0]);
      }
    }
    
    throw new Error('Signup failed. Please try again.');
  }
}

export async function requestPasswordReset(email: string): Promise<PasswordResetResponse> {
  try {
    const response = await http.post<PasswordResetResponse>('/api/v1/accounts/password-reset/', { email });
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || error.response?.data?.email?.[0] || 'Password reset request failed';
    throw new Error(message);
  }
}

export async function confirmPasswordReset(data: PasswordResetConfirm): Promise<PasswordResetResponse> {
  try {
    const response = await http.post<PasswordResetResponse>('/api/v1/accounts/password-reset/confirm/', data);
    return response.data;
  } catch (error: any) {
    // Handle validation errors
    if (error.response?.data) {
      const errorData = error.response.data;
      
      // If it's a validation error with field-specific messages
      if (typeof errorData === 'object' && !errorData.detail) {
        const firstFieldError = Object.values(errorData)[0];
        const message = Array.isArray(firstFieldError) ? firstFieldError[0] : firstFieldError;
        throw new Error(message as string);
      }
      
      // If it's a detail error message
      if (errorData.detail) {
        throw new Error(errorData.detail);
      }
    }
    
    throw new Error('Password reset failed. Please try again.');
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
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
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
  
  if (!/(?=.*\\d)/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  
  return { isValid: true };
}

// Utility function to check if passwords match
export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}
'''

# Write the file
frontend_path = "../trade-lane-pro/src/lib/auth.ts"
with open(frontend_path, 'w', encoding='utf-8') as f:
    f.write(auth_content)

print(f"Successfully updated {frontend_path}")
print("✅ Enhanced auth.ts with signup and password reset functionality")
