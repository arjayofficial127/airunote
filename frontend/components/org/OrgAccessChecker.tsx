'use client';

import { useEffect, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import UnauthorizedError from '@/components/errors/UnauthorizedError';

interface OrgAccessCheckerProps {
  children: React.ReactNode;
}

export default function OrgAccessChecker({ children }: OrgAccessCheckerProps) {
  const params = useParams();
  const pathname = usePathname();
  const orgSession = useOrgSession();
  const orgId = params?.orgId as string;
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [errorStatus, setErrorStatus] = useState<401 | 403 | null>(null);

  useEffect(() => {
    // Only check for org-scoped routes
    if (!orgId || !pathname?.startsWith(`/orgs/${orgId}`)) {
      setHasAccess(true);
      return;
    }

    // Skip org access check for page viewing routes
    // Page routes handle their own authentication/authorization
    // The page component will show appropriate errors for unauthenticated/unauthorized users
    const isPageRoute = pathname?.match(/^\/orgs\/[^/]+\/pages\/[^/]+$/);
    if (isPageRoute) {
      setHasAccess(true);
      return;
    }

    // Check org access using OrgSessionProvider instead of direct API call
    if (orgSession.status === 'ready' && orgSession.activeOrgId === orgId) {
      setHasAccess(true);
      setErrorStatus(null);
    } else if (orgSession.status === 'error') {
      setHasAccess(false);
      setErrorStatus(403);
    } else if (orgSession.status === 'ready' && orgSession.activeOrgId !== orgId) {
      // Org ID mismatch - user might not have access
      setHasAccess(false);
      setErrorStatus(403);
    }
    // If status is 'loading' or 'idle', wait (hasAccess stays null)
  }, [orgId, pathname, orgSession]);

  // Show loading while checking
  if (hasAccess === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Show error page if no access
  if (hasAccess === false && errorStatus) {
    return <UnauthorizedError statusCode={errorStatus} />;
  }

  // Allow access
  return <>{children}</>;
}
