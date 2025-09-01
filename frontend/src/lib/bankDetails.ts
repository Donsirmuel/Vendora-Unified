import http from './http';

export interface BankDetail {
  id: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  instructions?: string;
  is_default: boolean;
  created_at: string;
}

export interface Paginated<T> {
  results: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}

export async function listBankDetails(page = 1): Promise<Paginated<BankDetail>> {
  const res = await http.get(`/api/v1/accounts/bank-details/?page=${page}`);
  return res.data;
}

export async function createBankDetail(data: Omit<BankDetail, 'id' | 'created_at'>): Promise<BankDetail> {
  const res = await http.post('/api/v1/accounts/bank-details/', data);
  return res.data;
}

export async function updateBankDetail(id: number, data: Partial<Omit<BankDetail, 'id' | 'created_at'>>): Promise<BankDetail> {
  const res = await http.patch(`/api/v1/accounts/bank-details/${id}/`, data);
  return res.data;
}

export async function deleteBankDetail(id: number): Promise<void> {
  await http.delete(`/api/v1/accounts/bank-details/${id}/`);
}
