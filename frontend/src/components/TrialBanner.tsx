import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

const formatRemaining = (deadline: Date) => {
  const now = new Date().getTime();
  const diff = Math.max(0, deadline.getTime() - now);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
};

const TrialBanner: React.FC = () => {
  const { user } = useAuth();
  const status = user?.subscription_status;
  const [dismissed, setDismissed] = useState<boolean>(() => localStorage.getItem('vendora_trial_banner_dismissed') === '1');
  const [tick, setTick] = useState<number>(0);

  const deadline = useMemo(() => {
    if (!status) return null;
    const iso = status.is_trial ? status.trial_expires_at : status.plan_expires_at;
    return iso ? new Date(iso) : null;
  }, [status]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000); // update every minute
    return () => clearInterval(id);
  }, []);

  if (!status) return null;
  if (status.plan === 'perpetual') return null;
  if (!status.is_trial && !status.plan_expires_at) return null;
  if (dismissed) return null;

  const isExpired = !status.active || status.expired || (deadline ? deadline.getTime() <= Date.now() : false);
  const isTrial = status.is_trial;
  const title = isExpired
    ? 'Your access has expired'
    : isTrial
    ? 'Trial is active'
    : 'Subscription expiring soon';

  const description = isExpired
    ? 'To continue using Vendora, send me a DM to activate your plan.'
    : isTrial
    ? `Enjoy full access during your trial. ${deadline ? formatRemaining(deadline) : ''}`
    : deadline
    ? `Your plan is active. ${formatRemaining(deadline)}`
    : 'Your plan is active.';

  const onDM = () => {
    const dmUrl = (import.meta as any).env?.VITE_DM_URL || 'https://t.me/';
    window.open(dmUrl, '_blank');
  };

  const onDismiss = () => {
    localStorage.setItem('vendora_trial_banner_dismissed', '1');
    setDismissed(true);
  };

  return (
    <div className="mb-4">
      <Alert className={`border-border ${isExpired ? 'bg-destructive/10' : 'bg-warning/10'}`}>
        <div className="flex items-start gap-3">
          <Clock className="h-4 w-4 mt-1 text-muted-foreground" />
          <div className="flex-1">
            <AlertTitle>{title}</AlertTitle>
            <AlertDescription className="mt-1 text-sm">
              {description}
            </AlertDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="bg-gradient-primary" onClick={onDM}>
              DM to upgrade
            </Button>
            <Button size="icon" variant="ghost" onClick={onDismiss} aria-label="Dismiss banner">
              ×
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
};

export default TrialBanner;
