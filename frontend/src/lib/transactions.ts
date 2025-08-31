import { http } from './http';

export interface Transaction {
  id: number;
  order: number;
  vendor: number;
  customer_chat_id: string;
  transaction_hash: string;
  amount: string;
  status: 'pending' | 'completed' | 'failed';
  proof_of_payment: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Transaction[];
}

export interface CompleteTransactionRequest {
  proof_of_payment: File;
}

export async function listTransactions(page = 1, status?: Transaction['status']): Promise<TransactionListResponse> {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (status) {
      params.append('status', status);
    }
    
    const response = await http.get<TransactionListResponse>(`/api/v1/transactions/?${params.toString()}`);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to load transactions';
    throw new Error(message);
  }
}

export async function getTransaction(id: number): Promise<Transaction> {
  try {
    const response = await http.get<Transaction>(`/api/v1/transactions/${id}/`);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to load transaction';
    throw new Error(message);
  }
}

export async function completeTransaction(id: number, data: CompleteTransactionRequest): Promise<Transaction> {
  try {
    const formData = new FormData();
    formData.append('proof_of_payment', data.proof_of_payment);
    
    const response = await http.post<Transaction>(`/api/v1/transactions/${id}/complete/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to complete transaction';
    throw new Error(message);
  }
}

export async function createTransaction(transactionData: Partial<Transaction>): Promise<Transaction> {
  try {
    const response = await http.post<Transaction>('/api/v1/transactions/', transactionData);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to create transaction';
    throw new Error(message);
  }
}

export async function updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction> {
  try {
    const response = await http.patch<Transaction>(`/api/v1/transactions/${id}/`, updates);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to update transaction';
    throw new Error(message);
  }
}
