'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
// ❌ Do not fetch orgs here
// ✅ Must consume from session provider
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { dashboardApi, type SuperAdminDashboardData } from '@/lib/api/dashboard';

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  // ✅ Consume orgs from session provider (no direct API call)
  const orgSession = useOrgSession();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const [dashboardData, setDashboardData] = useState<SuperAdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const redirectToAppropriatePage = () => {
      // Wait for super admin check to complete
      if (superAdminLoading) {
        return;
      }

      // Super admins stay on dashboard page - don't redirect
      if (isSuperAdmin) {
        return;
      }

      // Wait for org session to be ready
      if (orgSession.status !== 'ready') {
        return;
      }

      // ✅ Use orgs from session provider (no direct API call)
      const orgs = orgSession.orgs || [];
      
      if (orgs.length === 0) {
        // No orgs - go to orgs page to create one
        router.push('/orgs');
      } else if (orgs.length === 1) {
        // One org - go directly to its dashboard
        router.push(`/orgs/${orgs[0].id}/dashboard`);
      } else {
        // Multiple orgs - show org selection page
        router.push('/orgs');
      }
    };

    redirectToAppropriatePage();
  }, [router, isSuperAdmin, superAdminLoading, orgSession.status, orgSession.orgs]);

  // Fetch dashboard data for super admin
  useEffect(() => {
    if (!superAdminLoading && isSuperAdmin) {
      const fetchDashboardData = async () => {
        try {
          setLoading(true);
          const data = await dashboardApi.getSuperAdminStats();
          setDashboardData(data);
        } catch (err) {
          console.error('Failed to load dashboard data:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchDashboardData();
    }
  }, [isSuperAdmin, superAdminLoading]);

  // If super admin, show dashboard content (sidebar is handled by parent layout)
  if (!superAdminLoading && isSuperAdmin) {
    return (
      <div className="h-full overflow-auto min-h-0 bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <div className="p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Super Admin Dashboard</h1>
              <p className="text-gray-600">Welcome back! Here&apos;s an overview of your system.</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : dashboardData ? (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {/* Organizations Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <Link href="/orgs" className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                        View All →
                      </Link>
                    </div>
                    <div className="space-y-1">
                      <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.totalOrgs}</p>
                      <p className="text-sm text-gray-600">Total Organizations</p>
                      <p className="text-xs text-green-600">{dashboardData.stats.activeOrgs} active</p>
                    </div>
                  </div>

                  {/* Builder stats hidden - AtomicFuel BASE mode */}
                </div>

                {/* Quick Actions & Recent Organizations */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Quick Actions */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                    <div className="space-y-3">
                      {/* Builder quick actions hidden - AtomicFuel BASE mode */}

                      <Link
                        href="/orgs"
                        className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors group"
                      >
                        <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">View All Organizations</p>
                          <p className="text-sm text-gray-500">Manage all organizations in the system</p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>

                  {/* Recent Organizations */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-gray-900">Recent Organizations</h2>
                      <Link href="/orgs" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        View All →
                      </Link>
                    </div>
                    {dashboardData.recentOrgs.length > 0 ? (
                      <div className="space-y-3">
                        {dashboardData.recentOrgs.map((org) => (
                          <Link
                            key={org.id}
                            href={`/orgs/${org.id}/dashboard`}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold">
                                {org.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                                  {org.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Created {new Date(org.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>No organizations yet</p>
                        <Link href="/orgs" className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block">
                          Create your first organization →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-gray-600">Failed to load dashboard data</p>
              </div>
            )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-gray-600 mb-2">Redirecting to dashboard...</div>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    </div>
  );
}
