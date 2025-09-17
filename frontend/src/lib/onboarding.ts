import api from './http';

export interface OnboardingStep {
  id: string;
  label: string;
  done: boolean;
}

export interface OnboardingStatus {
  steps: OnboardingStep[];
  completed: number;
  total: number;
  percent: number;
}

export async function fetchOnboarding(): Promise<OnboardingStatus> {
  const { data } = await api.get('/api/v1/accounts/vendors/onboarding/');
  return data as OnboardingStatus;
}