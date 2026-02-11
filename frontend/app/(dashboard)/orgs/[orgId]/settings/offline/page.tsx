'use client';

/**
 * Phase 3 — Offline control panel page (Step 3.5).
 * Authority: activeOrgId from OrgSessionProvider only.
 */

import Link from 'next/link';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useOrgPermissions } from '@/hooks/useOrgPermissions';
import UnauthorizedError from '@/components/errors/UnauthorizedError';
import OfflineControlPanel from '@/components/OfflineControlPanel';

export default function OfflineSettingsPage() {
  const orgSession = useOrgSession();
  const orgId = orgSession.activeOrgId;
  const { isAdmin, loading: permissionsLoading } = useOrgPermissions(orgId);

  if (permissionsLoading) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Checking permissions…</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <UnauthorizedError
        statusCode={403}
        message="You do not have permission to access offline settings. Admin role is required."
      />
    );
  }

  if (!orgId) {
    return (
      <div className="p-8">
        <div className="text-gray-600">No organization selected.</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-4">
        <Link
          href={`/orgs/${orgId}/settings`}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back to settings
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Offline data</h1>
      <p className="text-sm text-gray-600 mb-6">
        View and manage offline data for this organization. All cleanup is user-initiated.
      </p>
      <OfflineControlPanel orgId={orgId} appId={null} />
    </div>
  );
}
