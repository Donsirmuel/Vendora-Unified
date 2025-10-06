import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BrandedEmptyStateProps = {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: string;
  actions?: ReactNode;
  className?: string;
};

export function BrandedEmptyState({
  icon: Icon,
  title,
  description,
  badge,
  actions,
  className,
}: BrandedEmptyStateProps) {
  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70 px-6 py-8 text-center shadow-lg shadow-primary/20 backdrop-blur",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="absolute -top-28 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
  <div className="relative mx-auto flex w-fit items-center justify-center rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10">
        <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
      </div>
      {badge && (
        <p className="relative mt-4 inline-flex items-center justify-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">
          {badge}
        </p>
      )}
      <h3 className="relative mt-5 text-xl font-semibold text-white">{title}</h3>
      <p className="relative mt-3 text-sm text-slate-300">{description}</p>
      {actions && <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">{actions}</div>}
    </div>
  );
}

export default BrandedEmptyState;
