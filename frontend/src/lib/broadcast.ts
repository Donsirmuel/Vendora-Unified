import { http } from './http';

export interface BroadcastMessage {
  id: number;
  vendor: number;
  message_type: 'asset_added' | 'rate_updated' | 'order_status' | 'general';
  title: string;
  content: string;
  is_sent: boolean;
  sent_at: string | null;
  created_at: string;
}

export interface CreateBroadcastRequest {
  title: string;
  content: string;
  message_type: BroadcastMessage['message_type'];
}

export interface BroadcastListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: BroadcastMessage[];
}

export async function listBroadcasts(page = 1): Promise<BroadcastListResponse> {
  try {
    const response = await http.get<BroadcastListResponse>(`/api/v1/accounts/broadcast-messages/?page=${page}`);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to load broadcasts';
    throw new Error(message);
  }
}

export async function createBroadcast(payload: CreateBroadcastRequest): Promise<BroadcastMessage> {
  try {
    const response = await http.post<BroadcastMessage>('/api/v1/accounts/broadcast-messages/', payload);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to create broadcast';
    throw new Error(message);
  }
}

export async function sendBroadcast(id: number): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await http.post(`/api/v1/accounts/broadcast-messages/${id}/send_to_bot/`);
    return { success: true, message: 'Broadcast sent successfully' };
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to send broadcast';
    return { success: false, error: message };
  }
}

export async function deleteBroadcast(id: number): Promise<void> {
  try {
    await http.delete(`/api/v1/accounts/broadcast-messages/${id}/`);
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to delete broadcast';
    throw new Error(message);
  }
}

export async function updateBroadcast(id: number, updates: Partial<CreateBroadcastRequest>): Promise<BroadcastMessage> {
  try {
    const response = await http.patch<BroadcastMessage>(`/api/v1/accounts/broadcast-messages/${id}/`, updates);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to update broadcast';
    throw new Error(message);
  }
}
