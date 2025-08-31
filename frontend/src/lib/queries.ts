import { http } from './http';

export interface Query {
  id: number;
  vendor: number;
  customer_chat_id: string;
  message: string;
  contact: string;
  status: 'pending' | 'replied' | 'resolved';
  notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QueryListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Query[];
}

export interface ReplyToQueryRequest {
  message: string;
}

export async function listQueries(page = 1, status?: Query['status']): Promise<QueryListResponse> {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (status) {
      params.append('status', status);
    }
    
    const response = await http.get<QueryListResponse>(`/api/v1/queries/?${params.toString()}`);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to load queries';
    throw new Error(message);
  }
}

export async function getQuery(id: number): Promise<Query> {
  try {
    const response = await http.get<Query>(`/api/v1/queries/${id}/`);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to load query';
    throw new Error(message);
  }
}

export async function replyToQuery(id: number, data: ReplyToQueryRequest): Promise<Query> {
  try {
    const response = await http.post<Query>(`/api/v1/queries/${id}/reply_to_customer/`, data);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to reply to query';
    throw new Error(message);
  }
}

export async function markQueryResolved(id: number): Promise<Query> {
  try {
    const response = await http.patch<Query>(`/api/v1/queries/${id}/`, { status: 'resolved' });
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to mark query as resolved';
    throw new Error(message);
  }
}

export async function deleteQuery(id: number): Promise<void> {
  try {
    await http.delete(`/api/v1/queries/${id}/`);
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to delete query';
    throw new Error(message);
  }
}
