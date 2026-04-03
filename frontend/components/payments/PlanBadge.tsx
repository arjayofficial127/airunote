'use client';

import { useOrgSession } from '@/providers/OrgSessionProvider';

export function PlanBadge() {
  const orgSession = useOrgSession();
  const plan = (orgSession.activeOrg?.plan || 'free').toLowerCase();
  const isPro = plan === 'pro';

  if (!orgSession.activeOrg) {
    return null;
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
        isPro ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
      }`}
    >
      {isPro ? 'Pro' : 'Free'}
    </span>
  );
}