import { http } from './http';

// Align types with backend rates.models.Rate and DRF serialization
export interface Rate {
  id: number;
  asset: string;
  buy_rate: string; // DRF DecimalField serializes to string
  sell_rate: string; // DRF DecimalField serializes to string
  contract_address?: string;
  bank_details?: string;
  vendor?: number; // present in API but not required in UI
}

export interface Paginated<T> {
  results: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}

export type CreateRateRequest = Omit<Rate, 'id' | 'vendor'>;
export type UpdateRateRequest = Partial<CreateRateRequest>;

export async function listRates(page = 1): Promise<Paginated<Rate>> {
  const response = await http.get<Paginated<Rate>>(`/api/v1/rates/?page=${page}`);
  return response.data;
}

export async function getRate(id: number): Promise<Rate> {
  const response = await http.get<Rate>(`/api/v1/rates/${id}/`);
  return response.data;
}

export async function createRate(data: CreateRateRequest): Promise<Rate> {
  const response = await http.post<Rate>('/api/v1/rates/', data);
  return response.data;
}

export async function updateRate(id: number, data: UpdateRateRequest): Promise<Rate> {
  const response = await http.patch<Rate>(`/api/v1/rates/${id}/`, data);
  return response.data;
}

export async function deleteRate(id: number): Promise<void> {
  await http.delete(`/api/v1/rates/${id}/`);
}
