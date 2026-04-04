'use client';

import { useEffect, useState } from 'react';
import { orgsApi, type OrgUsage } from '@/lib/api/orgs';
import { useOrgSession } from '@/providers/OrgSessionProvider';

function formatRemaining(value: number | null): string {
  if (value === null) {
    return 'Unlimited';
  }

  return `${value} left`;
}

export function PlanBadge() {
  const orgSession = useOrgSession();
  const activeOrg = orgSession.activeOrg;
  const plan = (activeOrg?.plan || 'free').toLowerCase();
  const isPro = plan === 'pro';
  const [usage, setUsage] = useState<OrgUsage | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadUsage = async () => {
      if (!activeOrg?.id) {
        setUsage(null);
        return;
      }

      try {
        const response = await orgsApi.getUsage(activeOrg.id);
        if (isActive) {
          setUsage(response.data);
        }
      } catch (error) {
        if (isActive) {
          setUsage(null);
        }
      }
    };

    loadUsage();

    return () => {
      isActive = false;
    };
  }, [activeOrg?.id]);

  if (!activeOrg) {
    return null;
  }

  return (
    <>
      <div
        className={`flex sm:hidden items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs shadow-sm ${
          isPro
            ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
            : 'border-slate-200 bg-slate-50/90 text-slate-900'
        }`}
      >
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${isPro ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
          {isPro ? 'Pro' : 'Free'}
        </span>
        <span className="text-[11px] font-medium text-slate-600">
          D {usage ? `${usage.documents.used}/${usage.documents.limit ?? '∞'}` : '...'}
        </span>
        <span className="text-[11px] font-medium text-slate-600">
          F {usage ? `${usage.folders.used}/${usage.folders.limit ?? '∞'}` : '...'}
        </span>
      </div>

      <div
        className={`hidden sm:flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-sm ${
          isPro
            ? 'border-emerald-200 bg-emerald-50/80 text-emerald-950'
            : 'border-slate-200 bg-slate-50/90 text-slate-900'
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
              isPro ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'
            }`}
          >
            {isPro ? 'Pro' : 'Free'}
          </span>
          <div className="leading-tight">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Current plan</div>
            <div className="text-sm font-semibold">{isPro ? 'Pro workspace' : 'Free workspace'}</div>
          </div>
        </div>

        <div className="hidden h-9 w-px bg-slate-200 lg:block" />

        <div className="flex items-center gap-2 flex-wrap">
          <div className="rounded-xl bg-white/90 px-3 py-2 ring-1 ring-slate-200">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Documents</div>
            <div className="text-sm font-semibold text-slate-900">
              {usage ? `${usage.documents.used} used` : '...'}
            </div>
            <div className="text-xs text-slate-500">
              {usage ? formatRemaining(usage.documents.remaining) : 'Loading'}
            </div>
          </div>

          <div className="rounded-xl bg-white/90 px-3 py-2 ring-1 ring-slate-200">
            <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Folders</div>
            <div className="text-sm font-semibold text-slate-900">
              {usage ? `${usage.folders.used} used` : '...'}
            </div>
            <div className="text-xs text-slate-500">
              {usage ? formatRemaining(usage.folders.remaining) : 'Loading'}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}