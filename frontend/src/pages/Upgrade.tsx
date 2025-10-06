import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { http } from '@/lib/http';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { usePaymentRequestSocket } from '@/lib/ws';
import BrandedEmptyState from '@/components/BrandedEmptyState';
import { Sparkles, TrendingUp, ShieldCheck, ArrowRight } from 'lucide-react';

export default function UpgradePage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('monthly');
  const { toast } = useToast();

  const formatPlanName = (plan?: string | null) => {
    switch (plan) {
      case 'monthly':
        return 'Monthly plan';
      case 'quarterly':
        return '3-month plan';
      case 'semi-annual':
        return '6-month plan';
      case 'annual':
        return 'Annual plan';
      case 'perpetual':
        return 'Perpetual plan';
      case 'none':
      case undefined:
      case null:
        return 'Free plan';
      default:
        return String(plan).replace(/-/g, ' ');
    }
  };

  const subscriptionStatus = user?.subscription_status;
  const currentPlanName = subscriptionStatus?.is_trial ? 'Trial plan' : formatPlanName(subscriptionStatus?.plan);
  const planRenewal = subscriptionStatus?.plan_expires_at ? new Date(subscriptionStatus.plan_expires_at).toLocaleDateString() : null;
  const trialEnds = subscriptionStatus?.trial_expires_at ? new Date(subscriptionStatus.trial_expires_at).toLocaleDateString() : null;

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
      await http.post('/api/v1/accounts/payment-requests/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast({ title: 'Submitted', description: 'Your payment receipt was submitted and is pending review.' });
      // Poll the latest endpoint with exponential backoff (max ~60s)
      (async () => {
        let wait = 3000; // initial 3s
        for (let i = 0; i < 10; i++) {
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

  const selectedPlanLabel = getPlanDisplayName(selectedPlan);
  const selectedPlanPrice = getPlanPrice(selectedPlan);
  const selectedPlanName = selectedPlanLabel.split(' - ')[0];

  return (
    <Layout title="Upgrade">
      <div className="space-y-10 pb-12">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-primary/25 px-8 py-10 text-white shadow-xl shadow-primary/20">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <Badge variant="outline" className="w-fit border-white/20 bg-white/10 uppercase tracking-[0.3em] text-xs text-primary/80">
                Upgrade Hub
              </Badge>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold md:text-4xl">Unlock unlimited orders</h1>
                <p className="max-w-2xl text-sm text-slate-200 md:text-base">
                  Vendora Pro lifts daily order caps, unlocks Telegram bot automations, and adds richer analytics so you can focus on moving volume.
                </p>
                <div className="flex flex-wrap gap-3 text-sm">
                  <Badge variant="secondary" className="bg-white/15 text-white hover:bg-white/20">
                    Current plan: {currentPlanName}
                  </Badge>
                  {planRenewal && (
                    <Badge variant="outline" className="border-white/25 bg-black/20 text-white">
                      Renews {planRenewal}
                    </Badge>
                  )}
                  {subscriptionStatus?.is_trial && trialEnds && (
                    <Badge variant="secondary" className="bg-primary/25 text-white">
                      Trial ends {trialEnds}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-100 shadow-inner">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.3em]">Why vendors upgrade</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-slate-200/90">
                <li className="flex items-start gap-2"><ArrowRight className="mt-1 h-3.5 w-3.5 text-primary/80" /><span>Unlimited Telegram bot orders beyond the free plan’s 10-per-day cap.</span></li>
                <li className="flex items-start gap-2"><ArrowRight className="mt-1 h-3.5 w-3.5 text-primary/80" /><span>Priority support plus roadmap input tailored to active desks.</span></li>
                <li className="flex items-start gap-2"><ArrowRight className="mt-1 h-3.5 w-3.5 text-primary/80" /><span>Deeper analytics to spot rate spreads, buyer trends, and settlement speed.</span></li>
              </ul>
            </div>
          </div>
        </div>

        <Card className="mx-auto max-w-5xl border border-border bg-gradient-card shadow-lg shadow-primary/10">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-2xl font-semibold">Choose your scale track</CardTitle>
              <Badge variant="secondary" className="bg-primary/15 text-primary">
                Selected: {selectedPlanPrice} • {selectedPlanName}
              </Badge>
            </div>
            <CardDescription>
              Pick the commitment window that matches your desk’s cadence. Every paid plan unlocks Telegram bot automations, unlimited orders, and premium support.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <PricingPlans selectedPlan={selectedPlan} onPlanSelect={setSelectedPlan} />
            <div className="rounded-2xl border border-border/70 bg-background/80 p-6 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Complete your upgrade
                </h3>
                <p className="text-sm text-muted-foreground">Pay to the preferred destination, then upload your receipt so we can activate your plan.</p>
              </div>
              <div className="mt-6 space-y-6">
                <PaymentDestinations />
                <PendingStateCard />
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="upgrade-receipt" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Receipt</Label>
                    <Input
                      id="upgrade-receipt"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e: any) => setFile(e.target.files?.[0] ?? null)}
                      className="bg-background border-border"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Upload a screenshot or PDF of your payment receipt.</p>
                  </div>
                  <div>
                    <Label htmlFor="upgrade-note" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Note (optional)</Label>
                    <Input
                      id="upgrade-note"
                      value={note}
                      onChange={(e: any) => setNote(e.target.value)}
                      className="bg-background border-border"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">Share any context for the payment review team.</p>
                  </div>
                  <div>
                    <Label htmlFor="upgrade-selected-plan" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selected plan</Label>
                    <Input
                      id="upgrade-selected-plan"
                      value={`${selectedPlanName} (${selectedPlanPrice})`}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" disabled={loading} className="bg-gradient-primary px-6 py-2 text-sm font-medium hover:opacity-90">
                      {loading ? 'Submitting…' : 'I have paid — submit receipt'}
                    </Button>
                    <p className="text-xs text-muted-foreground">We’ll notify you once an admin approves the upgrade.</p>
                  </div>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function PricingPlans({ selectedPlan, onPlanSelect }: { selectedPlan: string; onPlanSelect: (plan: string) => void }) {
  const plans = [
    {
      id: 'monthly',
      name: 'Monthly Plan',
      price: '$22.99',
      period: '/month',
      description: '$0.75 per day • Stay flexible month-to-month',
  features: ['Unlimited orders per day', 'Advanced rate management', 'Full Telegram bot', 'Priority support', 'Real-time notifications'],
      popular: true
    },
    {
      id: 'quarterly',
      name: '3-Month Plan',
      price: '$68.97',
      period: '/3 months',
      description: 'Lock in savings each quarter',
      features: ['Everything in Monthly', 'Quarterly commitment savings', 'Quarterly business reports'],
      popular: false
    },
    {
      id: 'semi-annual',
      name: '6-Month Plan',
      price: '$137.94',
      period: '/6 months',
      description: 'Dial in mid-term runway',
      features: ['Everything in Monthly', 'Semi-annual savings', 'Advanced analytics'],
      popular: false
    },
    {
      id: 'annual',
      name: 'Annual Plan',
      price: '$275.88',
      period: '/year',
      description: 'Stack the best savings all year',
      features: ['Everything in Monthly', 'Annual commitment savings', 'Premium support & features', 'Annual business insights'],
      badge: 'Best value'
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {plans.map((plan) => {
        const isSelected = selectedPlan === plan.id;
        return (
          <Card
            key={plan.id}
            className={`flex h-full flex-col justify-between border transition-all ${
              isSelected ? 'border-primary bg-primary/5 shadow-lg shadow-primary/20' : 'hover:border-primary/40'
            } ${plan.popular ? 'border-orange-500/70' : ''}`}
            onClick={() => onPlanSelect(plan.id)}
          >
            <CardHeader className="space-y-4 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">{plan.name}</CardTitle>
                <div className="flex gap-2">
                  {plan.popular && (
                    <Badge className="bg-orange-500 text-orange-50">Popular</Badge>
                  )}
                  {plan.badge && (
                    <Badge className="bg-emerald-500 text-emerald-50">{plan.badge}</Badge>
                  )}
                  {isSelected && (
                    <Badge variant="secondary" className="bg-primary/20 text-primary">Selected</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">{plan.price}</span>
                <span className="text-sm text-muted-foreground">{plan.period}</span>
              </div>
              <p className="text-sm text-muted-foreground">{plan.description}</p>
            </CardHeader>
            <CardContent className="pt-0">
              <ul className="space-y-2 text-sm">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-primary">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PaymentDestinations() {
  const [items, setItems] = useState<any[]>([]);
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
    <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">Primary payment destinations</p>
      <p className="mt-2">
        <strong>Fiat (NGN):</strong> Access Bank • 1698607544 • Samuel Olaonipekun
      </p>
      <p className="mt-1">
        <strong>Crypto (USDT - TRC20):</strong> TEKqMZauPyXpj6YCJnmfe37DSRPU93K1oX
      </p>
      <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
        Pro tip: Avoid crypto keywords in bank transfer narrations — your Vendora username works perfectly.
      </p>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Payment destinations</p>
      <ul className="space-y-3">
        {items.map((destination) => (
          <li key={destination.id} className="rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-primary/5 p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">{destination.name}</p>
                <Badge variant="outline" className="mt-1 uppercase tracking-wide text-xs">{destination.kind}</Badge>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{destination.details}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PendingStateCard() {
  const [latest, setLatest] = useState<any | null>(null);

  const load = useCallback(async () => {
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

  const handleSocketMessage = useCallback((data: any) => {
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

  if (!latest) {
    return (
      <BrandedEmptyState
        icon={TrendingUp}
        badge="Activation in review"
        title="No payment requests yet"
        description="Upload your receipt after payment and our team will flip your plan live within minutes."
        className="bg-slate-950"
      />
    );
  }

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
