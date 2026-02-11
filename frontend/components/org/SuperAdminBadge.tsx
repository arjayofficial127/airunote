'use client';

import { useSuperAdmin } from '@/hooks/useSuperAdmin';

export function SuperAdminBadge() {
  const { isSuperAdmin, loading } = useSuperAdmin();

  if (loading) {
    return null;
  }

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
      </svg>
      <span className="text-sm font-semibold text-blue-600">Super Admin</span>
    </div>
  );
}

