'use client';

import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useOrgUsage } from '@/hooks/useOrgUsage';

function formatRemaining(value: number | null): string {
  if (value === null) {
    return 'Unlimited';
  }

  return `${value} left`;
}

export function PlanBadge() {
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

  const toneClassName = isPendingPlan
    ? 'border-sky-200 bg-sky-50/90 text-sky-950'
    : isPro
      ? 'border-emerald-200 bg-emerald-50/85 text-emerald-950'
      : 'border-slate-200 bg-slate-50/95 text-slate-900';

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
      className={`inline-flex h-9 items-center rounded-full border px-3 text-[11px] font-semibold uppercase tracking-[0.18em] shadow-sm transition-colors ${toneClassName}`}
      title={badgeLabel}
      aria-label={badgeLabel}
    >
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-1 leading-none ${pillClassName}`}
      >
        {planLabel}
      </span>
    </div>
  );
}
