import { http, tokenStore, Tokens } from './http';

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
