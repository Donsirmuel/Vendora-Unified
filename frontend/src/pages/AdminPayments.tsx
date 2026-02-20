import React, { useEffect, useState, useCallback } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { http } from '@/lib/http';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import BrandedEmptyState from '@/components/BrandedEmptyState';
import { ShieldCheck, RefreshCw, Users, ArrowRight, Sparkles } from 'lucide-react';

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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchItems = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    if (!user || !(user.is_staff || user.is_superuser)) return;
    void fetchItems();
  }, [user, fetchItems]);

  const refresh = async () => {
    setIsRefreshing(true);
    await fetchItems();
    setIsRefreshing(false);
  };

  const action = async (id: number, op: 'approve' | 'reject') => {
    try {
      await http.post(`/api/v1/accounts/payment-requests/${id}/${op}/`);
  await fetchItems();
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.detail || 'Failed');
    }
  };

  if (!user || !(user.is_staff || user.is_superuser)) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground">You need admin access to view payment requests.</div>
      </Layout>
    );
  }

  return (
    <Layout title="Admin Payments">
      <div className="space-y-8 pb-10">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-primary/20 px-8 py-10 text-white shadow-xl shadow-primary/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <Badge variant="outline" className="w-fit border-white/20 bg-white/10 uppercase tracking-[0.3em] text-xs text-primary/80">
                Operations
              </Badge>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold md:text-4xl">Approve vendor upgrades</h1>
                <p className="max-w-2xl text-sm text-slate-200 md:text-base">
                  Keep accounts active by approving valid receipts quickly and rejecting suspicious ones.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <Badge variant="secondary" className="bg-white/15 text-white hover:bg-white/20">
                  Pending queue: {items.length}
                </Badge>
                <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
                  Telegram bot escalations auto-sync here
                </Badge>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-100 shadow-inner">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.3em]">Daily cadence</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-200/90">
                <li className="flex items-start gap-2"><ArrowRight className="mt-1 h-3.5 w-3.5 text-primary/80" /><span>Check new receipts at open, after lunch, and pre-close.</span></li>
                <li className="flex items-start gap-2"><ArrowRight className="mt-1 h-3.5 w-3.5 text-primary/80" /><span>Approve verified payments to unlock unlimited orders immediately.</span></li>
                <li className="flex items-start gap-2"><ArrowRight className="mt-1 h-3.5 w-3.5 text-primary/80" /><span>Reject suspicious uploads so fraudsters never touch Vendora Pro.</span></li>
              </ul>
            </div>
          </div>
        </div>

        <Card className="border border-border bg-gradient-card">
          <CardHeader className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-semibold">Pending payment requests</CardTitle>
              <CardDescription>Review receipts and unlock the right accounts. Actions update the vendor account instantly.</CardDescription>
            </div>
            <Button onClick={refresh} disabled={isRefreshing || loading} variant="secondary" className="gap-2">
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh queue
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="py-10 text-center text-muted-foreground">Loading payment requests…</div>
            ) : items.length === 0 ? (
              <BrandedEmptyState
                icon={ShieldCheck}
                badge="Queue clear"
                title="No pending receipts"
                description="Every vendor upgrade has been reviewed. Keep this tab handy as the Telegram bot feeds new submissions."
                className="bg-slate-950"
              />
            ) : (
              <ul className="space-y-4">
                {items.map((it) => {
                  const vendorName = typeof it.vendor === 'object' ? it.vendor.name || it.vendor.email : `Vendor ${it.vendor}`;
                  return (
                    <li key={it.id} className="rounded-2xl border border-border/70 bg-background/90 p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-foreground flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            {vendorName}
                          </p>
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">Request #{it.id}</p>
                          <p className="text-sm text-muted-foreground">Submitted {new Date(it.created_at).toLocaleString()}</p>
                          {it.note && <p className="mt-2 text-sm text-foreground">{it.note}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button onClick={() => action(it.id, 'approve')} className="bg-gradient-success hover:opacity-90">
                            Approve &amp; activate
                          </Button>
                          <Button onClick={() => action(it.id, 'reject')} variant="destructive">
                            Reject
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminPayments;
