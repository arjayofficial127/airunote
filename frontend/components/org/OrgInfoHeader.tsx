'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useOrgPermissions } from '@/hooks/useOrgPermissions';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { orgsApi, type Org } from '@/lib/api/orgs';
import Link from 'next/link';

export function OrgInfoHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const orgSession = useOrgSession();
  const orgId = orgSession.activeOrgId;
  const [org, setOrg] = useState<Org | null>(null);
  const [allOrgs, setAllOrgs] = useState<Org[]>([]);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { isAdmin, isMember, roles, loading: permissionsLoading } = useOrgPermissions(orgId);
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();

  // Destructure orgSession fields to depend on primitives
  const activeOrg = orgSession.activeOrg;
  const orgStatus = orgSession.status;
  const orgs = orgSession.orgs;
  const refetch = orgSession.refetch;

  useEffect(() => {
    // Only show org info if we're in an org context
    if (!orgId) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
      if (!orgId) {
        setLoading(false);
        return;
      }
      try {
        // Use org data from OrgSessionProvider instead of direct API call
        if (activeOrg) {
          setOrg(activeOrg);
        } else if (orgStatus === 'ready') {
          // Org not loaded yet, trigger refetch
          await refetch();
          // Read updated org from session after refetch
          const updatedOrg = orgSession.activeOrg;
          if (updatedOrg) {
            setOrg(updatedOrg);
          }
        }
        // Use orgs list from OrgSessionProvider
        setAllOrgs(orgs || []);
      } catch (err) {
        console.error('Failed to load org info:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [orgId, activeOrg, orgStatus, orgs, refetch, orgSession]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowOrgSwitcher(false);
      }
    };

    if (showOrgSwitcher) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showOrgSwitcher]);

  const handleOrgSwitch = (newOrgId: string) => {
    setShowOrgSwitcher(false);
    // Extract the current path and replace orgId
    const newPath = pathname?.replace(/\/orgs\/[^/]+/, `/orgs/${newOrgId}`) || `/orgs/${newOrgId}/dashboard`;
    router.push(newPath);
  };

  // Don't show anything if not in org context
  if (!orgId) {
    return null;
  }

  // Show loading state
  if (loading || permissionsLoading || superAdminLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="text-sm">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
        </div>
      </div>
    );
  }

  if (!org) {
    return null;
  }

  const hasMultipleOrgs = allOrgs.length > 1;
  // Get the primary role (prefer admin, then member, then viewer)
  const getPrimaryRole = () => {
    if (roles.includes('admin') || roles.includes('ADMIN')) return 'Admin';
    if (roles.includes('member') || roles.includes('MEMBER')) return 'Member';
    if (roles.includes('viewer') || roles.includes('VIEWER')) return 'Viewer';
    if (roles.includes('superadmin') || roles.includes('SUPERADMIN')) return 'Super Admin';
    if (isAdmin) return 'Admin';
    if (isMember) return 'Member';
    return 'Viewer';
  };
  
  const primaryRole = getPrimaryRole();

  return (
    <div className="flex items-center gap-3">
      {/* Current Org Info */}
      <div className="flex items-center gap-2">
        <div className="text-sm">
          <div className="font-medium text-gray-900">{org.name}</div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 capitalize">{primaryRole}</span>
            {isSuperAdmin && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-blue-600 font-semibold">Super Admin</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Org Switcher (only if multiple orgs) */}
      {hasMultipleOrgs && (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowOrgSwitcher(!showOrgSwitcher)}
            className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition"
            title="Switch organization"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </button>

          {showOrgSwitcher && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                Switch Organization
              </div>
              {allOrgs.map((o) => (
                <button
                  key={o.id}
                  onClick={() => handleOrgSwitch(o.id)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition ${
                    o.id === orgId ? 'bg-blue-50 text-blue-900 font-medium' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{o.name}</span>
                    {o.id === orgId && (
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

