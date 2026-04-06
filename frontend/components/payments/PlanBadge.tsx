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

  return (
    <>
      <div
        className={`flex min-w-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs shadow-sm sm:hidden ${toneClassName}`}
      >
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${pillClassName}`}
        >
          {planLabel}
        </span>
        <span className="text-[11px] font-medium text-slate-600">
          D {usage ? `${usage.documents.used}/${usage.documents.limit ?? '∞'}` : '...'}
        </span>
        <span className="text-[11px] font-medium text-slate-600">
          F {usage ? `${usage.folders.used}/${usage.folders.limit ?? '∞'}` : '...'}
        </span>
      </div>

      <div
        className={`hidden md:flex min-w-0 items-stretch overflow-hidden rounded-[22px] border shadow-sm ${toneClassName}`}
      >
        <div className="flex min-w-0 items-center gap-2 px-3 py-2.5 lg:px-4">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${pillClassName}`}
          >
            {planLabel}
          </span>
          <div className="min-w-0 leading-tight">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Workspace</div>
            <div className="truncate text-sm font-semibold">{planDescription}</div>
          </div>
        </div>

        <div className="h-auto w-px bg-white/70" />

        <div className="hidden items-center lg:flex">
          <div className="px-3 py-2.5 xl:px-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Documents</div>
            <div className="text-sm font-semibold text-slate-900">
              {usage ? `${usage.documents.used} used` : 'Loading'}
            </div>
            <div className="text-xs text-slate-500">
              {usage ? formatRemaining(usage.documents.remaining) : 'Syncing limit'}
            </div>
          </div>
        </div>

        <div className="hidden h-auto w-px bg-white/70 xl:block" />

        <div className="hidden items-center xl:flex">
          <div className="px-4 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Folders</div>
            <div className="text-sm font-semibold text-slate-900">
              {usage ? `${usage.folders.used} used` : 'Loading'}
            </div>
            <div className="text-xs text-slate-500">
              {usage ? formatRemaining(usage.folders.remaining) : 'Syncing limit'}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
