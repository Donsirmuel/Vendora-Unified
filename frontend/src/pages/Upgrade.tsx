import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { http } from '@/lib/http';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { tokenStore } from '@/lib/http';
import { usePaymentRequestSocket } from '@/lib/ws';
import { CardDescription } from '@/components/ui/card';

export default function UpgradePage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('monthly');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({ title: 'Upload a receipt', description: 'Please attach a payment receipt file', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('receipt', file);
      fd.append('note', note);
      const res = await http.post('/api/v1/accounts/payment-requests/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast({ title: 'Submitted', description: 'Your payment receipt was submitted and is pending review.' });
      // Poll the latest endpoint with exponential backoff (max ~60s)
      let cancelled = false;
      (async () => {
        let wait = 3000; // initial 3s
        for (let i = 0; i < 10 && !cancelled; i++) {
          try {
            const res = await http.get('/api/v1/accounts/payment-requests/latest/');
            if (res.status === 200 && res.data) {
              const pr = res.data;
              if (pr.status === 'approved') {
                toast({ title: 'Activated', description: 'Your account has been activated by the admin.' });
                break;
              }
              if (pr.status === 'rejected') {
                toast({ title: 'Rejected', description: 'Your payment request was rejected. Please contact support.' , variant: 'destructive'});
                break;
              }
            }
          } catch (err) {
            // 404 means no payment request yet — keep trying
          }
          // sleep
          await new Promise((r) => setTimeout(r, wait));
          wait = Math.min(10000, Math.round(wait * 1.6));
        }
      })();
    } catch (e:any) {
      toast({ title: 'Failed', description: 'Could not submit receipt', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getPlanDisplayName = (plan: string) => {
    switch (plan) {
      case 'monthly': return 'Monthly Plan - $22.99/month';
      case 'quarterly': return '3-Month Plan - $68.97/3 months';
      case 'semi-annual': return '6-Month Plan - $137.94/6 months';
      case 'annual': return 'Annual Plan - $275.88/year';
      default: return 'Monthly Plan - $22.99/month';
    }
  };

  const getPlanPrice = (plan: string) => {
    switch (plan) {
      case 'monthly': return '$22.99';
      case 'quarterly': return '$68.97';
      case 'semi-annual': return '$137.94';
      case 'annual': return '$275.88';
      default: return '$22.99';
    }
  };

  return (
    <div className="p-6">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Upgrade Your Account</CardTitle>
          <CardDescription>
            Choose a plan that fits your needs. All plans include unlimited features except the Free plan which is limited to 10 orders per day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PricingPlans selectedPlan={selectedPlan} onPlanSelect={setSelectedPlan} />
          
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-lg font-semibold mb-4">Complete Your Upgrade</h3>
            <p className="mb-4">To activate your selected plan, please pay to the following details and upload your payment receipt below.</p>
            <PaymentDestinations />
            <PendingStateCard />

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Receipt</label>
                <Input type="file" onChange={(e:any)=>setFile(e.target.files?.[0] ?? null)} accept="image/*,application/pdf" />
              </div>
              <div>
                <label className="block text-sm font-medium">Note (optional)</label>
                <Input value={note} onChange={(e:any)=>setNote(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Selected Plan</label>
                <Input value={getPlanDisplayName(selectedPlan)} readOnly className="bg-muted" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'I have paid — Submit receipt'}</Button>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PricingPlans({ selectedPlan, onPlanSelect }: { selectedPlan: string; onPlanSelect: (plan: string) => void }) {
  const plans = [
    {
      id: 'monthly',
      name: 'Monthly Plan',
      price: '$22.99',
      period: '/month',
      description: '$0.75 per day • Most popular',
      features: ['Unlimited orders per day', 'Advanced rate management', 'Full Telegram bot features', 'Priority support', 'Real-time notifications'],
      popular: true
    },
    {
      id: 'quarterly',
      name: '3-Month Plan',
      price: '$68.97',
      period: '/3 months',
      description: '$0.75 per day • Better commitment',
      features: ['Everything in Monthly', 'Extended commitment savings', 'Quarterly business reports'],
      popular: false
    },
    {
      id: 'semi-annual',
      name: '6-Month Plan',
      price: '$137.94',
      period: '/6 months',
      description: '$0.75 per day • Better value',
      features: ['Everything in Monthly', 'Semi-annual savings', 'Advanced analytics'],
      popular: false
    },
    {
      id: 'annual',
      name: 'Annual Plan',
      price: '$275.88',
      period: '/year',
      description: '$0.75 per day • Best value',
      features: ['Everything in Monthly', 'Annual commitment savings', 'Premium support & features', 'Annual business insights'],
      badge: 'BEST VALUE'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {plans.map((plan) => (
        <Card 
          key={plan.id} 
          className={`cursor-pointer transition-all ${
            selectedPlan === plan.id 
              ? 'border-primary bg-primary/5' 
              : 'hover:border-primary/50'
          } ${plan.popular ? 'border-orange-500' : ''}`}
          onClick={() => onPlanSelect(plan.id)}
        >
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              {plan.popular && (
                <span className="bg-orange-500 text-orange-50 px-2 py-1 text-xs font-semibold rounded-full">
                  POPULAR
                </span>
              )}
              {plan.badge && (
                <span className="bg-green-500 text-green-50 px-2 py-1 text-xs font-semibold rounded-full">
                  {plan.badge}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-primary">{plan.price}</span>
              <span className="text-muted-foreground">{plan.period}</span>
            </div>
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm">
                  <span className="text-primary mr-2">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PaymentDestinations() {
  const [items, setItems] = React.useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await http.get('/api/v1/accounts/global-payment-destinations/');
        if (!cancelled) setItems(res.data.results || res.data);
      } catch (e:any) {
        toast({ title: 'Failed to load payment options', description: 'Could not fetch payment destinations', variant: 'destructive' });
      }
    })();
    return () => { cancelled = true; };
  }, [toast]);

  if (!items || items.length === 0) return (
    <div className="mb-4">
      <p><strong>Pay to (Fiat/Naira):</strong> Bank: Access Bank • Acc: 1698607544 • Name: Samuel Olaonipekun</p>
      <p><strong>Pay to (Crypto):</strong> USDT (TRC20): </p>
      <p><strong>Note:</strong> When making Bank Transfer, do not use any crypto words as description, your username is enough as a description.</p>
    </div>
  );

  return (
    <div className="mb-4">
      <p className="font-medium">Payment destinations</p>
      <ul className="mt-2 space-y-2">
        {items.map(i => (
          <li key={i.id} className="p-3 border rounded">
            <p className="font-semibold">{i.name} — {i.kind}</p>
            <p className="text-sm whitespace-pre-wrap">{i.details}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PendingStateCard() {
  const [latest, setLatest] = React.useState<any | null>(null);
  const { toast } = useToast();

  const load = React.useCallback(async () => {
    try {
      const res = await http.get('/api/v1/accounts/payment-requests/latest/');
      if (res.status === 200) {
        setLatest(res.data);
      } else {
        setLatest(null);
      }
    } catch (e:any) {
      setLatest(null);
    }
  }, []);

  const handleSocketMessage = React.useCallback((data: any) => {
    if (Array.isArray(data)) {
      setLatest(data[data.length - 1]);
    } else if (data) {
      setLatest(data);
    } else {
      setLatest(null);
    }
  }, []);

  const { connected } = usePaymentRequestSocket(handleSocketMessage);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (connected) {
      load();
    }
  }, [connected, load]);

  if (!latest) return null;

  return (
    <div className="mb-4">
      <p className="font-medium">Latest payment request</p>
      <div className="mt-2 p-3 border rounded bg-muted/5">
        <p className="font-semibold">Status: {latest.status}</p>
        <p className="text-sm">Submitted: {new Date(latest.created_at).toLocaleString()}</p>
        {latest.processed_at && <p className="text-sm">Processed: {new Date(latest.processed_at).toLocaleString()} by {latest.processed_by || 'admin'}</p>}
        {latest.note && <p className="mt-2 whitespace-pre-wrap">{latest.note}</p>}
      </div>
    </div>
  );
}
