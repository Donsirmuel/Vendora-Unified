import { http } from './http';

export interface Rate {
  id: number;
  vendor: number;
  asset: string;
  buy_rate: string;
  sell_rate: string;
  bank_details: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRateRequest {
  asset: string;
  buy_rate: string;
  sell_rate: string;
  bank_details: string;
}

export interface UpdateRateRequest extends Partial<CreateRateRequest> {
  is_active?: boolean;
}

export interface RateListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Rate[];
}

export async function listRates(page = 1): Promise<RateListResponse> {
  try {
    const response = await http.get<RateListResponse>(`/api/v1/rates/?page=${page}`);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to load rates';
    throw new Error(message);
  }
}

export async function getRate(id: number): Promise<Rate> {
  try {
    const response = await http.get<Rate>(`/api/v1/rates/${id}/`);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to load rate';
    throw new Error(message);
  }
}

export async function createRate(data: CreateRateRequest): Promise<Rate> {
  try {
    const response = await http.post<Rate>('/api/v1/rates/', data);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to create rate';
    throw new Error(message);
  }
}

export async function updateRate(id: number, data: UpdateRateRequest): Promise<Rate> {
  try {
    const response = await http.patch<Rate>(`/api/v1/rates/${id}/`, data);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to update rate';
    throw new Error(message);
  }
}

export async function deleteRate(id: number): Promise<void> {
  try {
    await http.delete(`/api/v1/rates/${id}/`);
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to delete rate';
    throw new Error(message);
  }
}

export async function toggleRateStatus(id: number, isActive: boolean): Promise<Rate> {
  try {
    const response = await http.patch<Rate>(`/api/v1/rates/${id}/`, { is_active: isActive });
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to update rate status';
    throw new Error(message);
  }
}
