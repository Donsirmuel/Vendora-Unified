import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { fetchOnboarding } from '@/lib/onboarding';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Props { className?: string }

export function OnboardingChecklist({ className }: Props) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: fetchOnboarding,
    staleTime: 60_000,
  });
  const [dismissed, setDismissed] = useState(false);

  // Auto-hide permanently when complete by simply not rendering (percent===100)
  const percent = data?.percent ?? 0;

  // If loading, still show a lightweight skeleton unless previously dismissed this session
  if (dismissed) return null;
  if (isLoading) return <div className={cn('rounded-md border p-4 text-xs bg-background/40', className)}>Loading onboarding…</div>;
  if (isError || !data) return <div className={cn('rounded-md border p-4 text-xs text-red-500 bg-background/40', className)}>Failed to load onboarding.</div>;

  if (percent >= 100) return null; // Completed: never show again

  const remaining = data.steps.filter(s => !s.done).length;

  return (
    <div className={cn('rounded-md border p-4 bg-background/60 backdrop-blur-sm relative', className)}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-sm">Getting Started</h3>
        <div className="flex items-center gap-3">
          <button onClick={() => refetch()} className="text-[11px] text-muted-foreground hover:underline">Refresh</button>
          <button
            aria-label="Dismiss onboarding checklist"
            onClick={() => setDismissed(true)}
            className="text-muted-foreground/70 hover:text-foreground transition text-xs"
          >×</button>
        </div>
      </div>
      <Progress value={percent} className="h-2 mb-3" />
      <ul className="space-y-1 mb-3">
        {data.steps.map(step => (
          <li key={step.id} className="flex items-start gap-2 text-xs">
            <span className={cn('mt-0.5 inline-block h-3 w-3 rounded-full border shrink-0', step.done ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-muted-foreground/40')} />
            <span className={cn('leading-snug', step.done ? 'line-through text-muted-foreground' : '')}>{step.label}</span>
          </li>
        ))}
      </ul>
      <div className="text-[11px] text-muted-foreground">
        {remaining === 0 ? 'All onboarding steps complete.' : `${remaining} step${remaining===1?'':'s'} remaining.`}
      </div>
    </div>
  );
}

export default OnboardingChecklist;