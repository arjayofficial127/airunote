'use client';

import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useOrgUsage } from '@/hooks/useOrgUsage';

interface PlanBadgeProps {
  compact?: boolean;
  className?: string;
}

function formatRemaining(value: number | null): string {
  if (value === null) {
    return 'Unlimited';
  }

  return `${value} left`;
}

export function PlanBadge({ compact = false, className = '' }: PlanBadgeProps) {
  const orgSession = useOrgSession();
  const activeOrg = orgSession.activeOrg;
  const rawPlan = typeof activeOrg?.plan === 'string' ? activeOrg.plan.toLowerCase() : null;
  const isPlanKnown = rawPlan === 'free' || rawPlan === 'pro';
  const isPendingPlan = !isPlanKnown && (!orgSession.hasAuthoritativeData || orgSession.isRefreshing);
  const plan = isPlanKnown ? rawPlan : null;
  const isPro = plan === 'pro';
  const usage = useOrgUsage(activeOrg?.id);

  if (!activeOrg) {
    return null;
  }

  const pillClassName = isPendingPlan
    ? 'bg-sky-600 text-white'
    : isPro
      ? 'bg-emerald-600 text-white'
      : 'bg-slate-900 text-white';

  const planLabel = isPendingPlan ? 'Syncing' : isPro ? 'Pro' : plan === 'free' ? 'Free' : 'Plan';
  const planDescription = isPendingPlan
    ? 'Confirming workspace plan'
    : isPro
      ? 'Pro workspace'
      : plan === 'free'
        ? 'Free workspace'
        : 'Workspace plan';

  const usageSummary = usage
    ? `Documents: ${usage.documents.used}/${usage.documents.limit ?? '∞'} used, ${formatRemaining(usage.documents.remaining)}. Folders: ${usage.folders.used}/${usage.folders.limit ?? '∞'} used, ${formatRemaining(usage.folders.remaining)}.`
    : 'Usage limits are syncing.';

  const badgeLabel = `${planDescription}. ${usageSummary}`;

  return (
    <div
      className={`inline-flex items-center ${className}`.trim()}
      title={badgeLabel}
      aria-label={badgeLabel}
    >
      <span
        className={`inline-flex items-center rounded-full leading-none ${compact ? 'px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em]' : 'px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]'} ${pillClassName}`}
      >
        {planLabel}
      </span>
    </div>
  );
}
