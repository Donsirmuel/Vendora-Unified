import { http } from './http';

export interface Order {
  id: number;
  vendor: number;
  customer_chat_id: string;
  order_code?: string;
  type: 'buy' | 'sell';
  asset: string;
  amount: number;
  rate: number;
  total_value: number | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'completed';
  auto_expire_at: string;
  pay_instructions?: string;
  send_instructions?: string;
  acceptance_note?: string;
  accepted_at?: string | null;
  declined_at?: string | null;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface OrderListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: Order[];
}

export interface AcceptOrderRequest {
  acceptance_note?: string;
  pay_instructions?: string;
  send_instructions?: string;
}

export interface DeclineOrderRequest {
  rejection_reason: string;
}

export async function listOrders(page = 1, status?: Order['status']): Promise<OrderListResponse> {
  try {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    if (status) {
      params.append('status', status);
    }
    
    const response = await http.get<OrderListResponse>(`/api/v1/orders/?${params.toString()}`);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to load orders';
    throw new Error(message);
  }
}

export async function getOrder(id: number): Promise<Order> {
  try {
    const response = await http.get<Order>(`/api/v1/orders/${id}/`);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to load order';
    throw new Error(message);
  }
}

export async function acceptOrder(id: number, data?: AcceptOrderRequest): Promise<Order> {
  try {
    const response = await http.post<Order>(`/api/v1/orders/${id}/accept/`, data || {});
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to accept order';
    throw new Error(message);
  }
}

export async function declineOrder(id: number, data: DeclineOrderRequest): Promise<Order> {
  try {
    const response = await http.post<Order>(`/api/v1/orders/${id}/decline/`, data);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to decline order';
    throw new Error(message);
  }
}

export async function createOrder(orderData: Partial<Order>): Promise<Order> {
  try {
    const response = await http.post<Order>('/api/v1/orders/', orderData);
    return response.data;
  } catch (error: any) {
    const message = error.response?.data?.detail || 'Failed to create order';
    throw new Error(message);
  }
}

// Expire overdue feature removed from UI per request
