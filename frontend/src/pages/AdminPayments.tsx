import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { http } from '@/lib/http';

interface PaymentRequestItem {
  id: number;
  vendor: number | { id: number; email: string; name: string };
  note?: string;
  status: string;
  created_at: string;
}

const AdminPayments: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<PaymentRequestItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !(user.is_staff || user.is_superuser)) return;
    fetchItems();
  }, [user]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await http.get('/api/v1/accounts/payment-requests/?status=pending');
      const data = res.data;
      const list = Array.isArray(data) ? data : data.results || [];
      setItems(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const action = async (id: number, op: 'approve' | 'reject') => {
    try {
      await http.post(`/api/v1/accounts/payment-requests/${id}/${op}/`);
      fetchItems();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.detail || 'Failed');
    }
  };

  if (!user || !(user.is_staff || user.is_superuser)) {
    return <div className="p-6">Unauthorized</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl mb-4">Pending Payment Requests</h2>
      {loading && <div>Loading...</div>}
      {!loading && items.length === 0 && <div>No pending requests</div>}
      <ul className="space-y-4">
        {items.map((it) => (
          <li key={it.id} className="border rounded p-4 flex justify-between items-center">
            <div>
              <div className="font-medium">{typeof it.vendor === 'object' ? it.vendor.name : `Vendor ${it.vendor}`}</div>
              <div className="text-sm text-muted-foreground">{it.note}</div>
              <div className="text-xs text-muted-foreground">{it.created_at}</div>
            </div>
            <div className="space-x-2">
              <button className="btn btn-primary" onClick={() => action(it.id, 'approve')}>Approve</button>
              <button className="btn btn-secondary" onClick={() => action(it.id, 'reject')}>Reject</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AdminPayments;
