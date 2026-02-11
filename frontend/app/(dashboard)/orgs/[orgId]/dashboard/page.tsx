'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
// ❌ Do not fetch auth/org/apps here
// ✅ Must consume from session provider
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useMetadataIndex } from '@/providers/MetadataIndexProvider';
import { dashboardApi } from '@/lib/api/dashboard';
import { postsApi, type Post } from '@/lib/api/posts';
import { FreshnessBadge } from '@/components/system/FreshnessBadge';
import { markChecked, setActiveOrgId } from '@/lib/freshness/freshnessService';
import { refreshScope } from '@/lib/refresh/manualRefreshService';
import { hardRefresh } from '@/lib/refresh/hardRefreshService';
import { toast } from '@/lib/toast';

interface AdminDashboardStats {
  totalPages: number;
  totalMembers: number;
  totalPosts: number;
  totalCollections: number;
}

interface RecentPost {
  id: string;
  title: string;
  createdAt: string;
  authorUserId: string;
}

interface AdminDashboardData {
  stats: AdminDashboardStats;
  recentPosts: RecentPost[];
}

export default function OrgDashboardPage() {
  // ❌ Do not use params.orgId directly
  // ✅ activeOrgId is SINGLE SOURCE OF TRUTH
  const orgSession = useOrgSession();
  const metadataIndex = useMetadataIndex();
  
  const orgId = orgSession.activeOrgId;
  const org = orgSession.activeOrg;
  const isAdmin = orgSession.roles.some((r: string) => r.toLowerCase() === 'admin');
  
  // Dev-only guardrail: warn if orgId is missing
  if (process.env.NODE_ENV === 'development' && !orgId) {
    console.warn('[OrgDashboardPage] activeOrgId is null - page should not render without active org');
  }
  
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hardRefreshing, setHardRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'stats' | 'actions' | 'posts'>('all');

  const fetchData = useCallback(async () => {
    // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
    // This ensures session authority and routing lock are respected
    if (!orgId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // ✅ Page may fetch page-specific metrics ONLY
      const dashboardRes = await dashboardApi.getAdminStats(orgId);
      setDashboardData(dashboardRes);
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
  }, [orgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  // Clear freshness on org change
  useEffect(() => {
    setActiveOrgId(orgId);
  }, [orgId]);

  // Mark dashboard as checked when data is resolved
  useEffect(() => {
    if (dashboardData && !loading) {
      markChecked('dashboard');
    }
  }, [dashboardData, loading]);

  // Handle refresh button click
  const handleRefresh = useCallback(async () => {
    if (!orgId || refreshing) return;

    try {
      setRefreshing(true);
      const result = await refreshScope('dashboard', orgId, {
        dashboard: dashboardData,
      });

      // Show feedback based on result
      if (result.reason === 'offline') {
        toast('Offline — cannot check right now.', 'warning');
      } else if (result.reason === 'network_error') {
        toast('Could not check for updates.', 'error');
      } else if (result.hasUpdates) {
        toast('Updates available.', 'info');
      } else {
        toast('No updates found.', 'success');
      }
    } catch (err) {
      console.error('Refresh error:', err);
      toast('Could not check for updates.', 'error');
    } finally {
      setRefreshing(false);
    }
  }, [orgId, dashboardData, refreshing]);

  // Handle hard refresh button click
  const handleHardRefresh = useCallback(async () => {
    if (!orgId || hardRefreshing) return;

    try {
      setHardRefreshing(true);
      
      // Clear dashboard state (component-local)
      const clearDashboard = () => {
        setDashboardData(null);
        // Note: We don't reset loading state - let it refetch naturally
      };

      await hardRefresh('dashboard', {
        clearDashboard,
        refreshAllMetadata: metadataIndex.refreshAll,
      });

      toast('Hard refresh queued. Data will reload on next view.', 'success');
      
      // Trigger refetch by resetting data (will cause useEffect to refetch)
      clearDashboard();
    } catch (err) {
      console.error('Hard refresh error:', err);
      toast('Hard refresh failed.', 'error');
    } finally {
      setHardRefreshing(false);
    }
  }, [orgId, hardRefreshing, metadataIndex.refreshAll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
                {org?.name || 'Dashboard'}
              </h1>
              <p className="text-sm sm:text-base text-gray-600">Welcome back! Here&apos;s an overview of your organization.</p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {dashboardData && <FreshnessBadge scope="dashboard" />}
              <button
                onClick={handleRefresh}
                disabled={refreshing || !dashboardData}
                className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                title="Check for updates"
              >
                {refreshing ? (
                  <>
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="hidden sm:inline">Refreshing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="hidden sm:inline">Refresh</span>
                  </>
                )}
              </button>
              <button
                onClick={handleHardRefresh}
                disabled={hardRefreshing || !dashboardData}
                className="px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                title="Hard refresh (clears memory cache)"
              >
                {hardRefreshing ? (
                  <>
                    <svg className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="hidden sm:inline">Hard refreshing...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span className="hidden sm:inline">Hard Refresh</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {dashboardData ? (
          <>
            {/* Mobile Tab Navigation - Above Stats */}
            <div className="sm:hidden mb-4">
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`flex-1 px-2 py-2 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`flex-1 px-2 py-2 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'stats'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Stats
                </button>
                {/* Apps tab hidden - AtomicFuel BASE mode */}
                <button
                  onClick={() => setActiveTab('actions')}
                  className={`flex-1 px-2 py-2 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'actions'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Actions
                </button>
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`flex-1 px-2 py-2 text-xs font-medium rounded-md transition-colors ${
                    activeTab === 'posts'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Posts
                </button>
              </div>
            </div>

            {/* Stats Grid - Pages and Site Nav hidden - AtomicFuel BASE mode */}
            <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 ${
              activeTab === 'stats' || activeTab === 'all' ? 'block' : 'hidden sm:block'
            }`}>
              {/* Pages and Site Nav cards removed */}

              {/* Posts Card - Hide for Admin */}
              {!isAdmin && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 hover:shadow-md transition-shadow">
                {/* Mobile: Single line layout */}
                <div className="flex sm:hidden items-center justify-between gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <p className="text-lg font-bold text-gray-900 whitespace-nowrap">{dashboardData.stats.totalPosts}</p>
                    <p className="text-xs text-gray-600 truncate">Total Posts</p>
                  </div>
                  <Link href={`/orgs/${orgId}/posts`} className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap flex-shrink-0">
                    View All →
                  </Link>
                </div>
                {/* Desktop: Original layout */}
                <div className="hidden sm:block">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <Link href={`/orgs/${orgId}/posts`} className="text-xs text-blue-600 hover:text-blue-700 font-medium self-start">
                      View All →
                    </Link>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.totalPosts}</p>
                    <p className="text-sm text-gray-600">Total Posts</p>
                  </div>
                </div>
              </div>
              )}

              {/* Members Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 hover:shadow-md transition-shadow">
                {/* Mobile: Single line layout */}
                <div className="flex sm:hidden items-center justify-between gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <p className="text-lg font-bold text-gray-900 whitespace-nowrap">{dashboardData.stats.totalMembers}</p>
                    <p className="text-xs text-gray-600 truncate">Team Members</p>
                  </div>
                  <Link href={`/orgs/${orgId}/members`} className="text-xs text-purple-600 hover:text-purple-700 font-medium whitespace-nowrap flex-shrink-0">
                    View All →
                  </Link>
                </div>
                {/* Desktop: Original layout */}
                <div className="hidden sm:block">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-1 mb-4">
                    <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.totalMembers}</p>
                    <p className="text-sm text-gray-600">{dashboardData.stats.totalMembers === 1 ? 'Team Member' : 'Team Members'}</p>
                  </div>
                  <Link href={`/orgs/${orgId}/members`} className="text-xs text-purple-600 hover:text-purple-700 font-medium">
                    View All →
                  </Link>
                </div>
              </div>

              {/* Collections Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-6 hover:shadow-md transition-shadow">
                {/* Mobile: Single line layout */}
                <div className="flex sm:hidden items-center justify-between gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <p className="text-lg font-bold text-gray-900 whitespace-nowrap">{dashboardData.stats.totalCollections}</p>
                    <p className="text-xs text-gray-600 truncate">Collections</p>
                  </div>
                  <Link href={`/orgs/${orgId}/collections`} className="text-xs text-orange-600 hover:text-orange-700 font-medium whitespace-nowrap flex-shrink-0">
                    View All →
                  </Link>
                </div>
                {/* Desktop: Original layout */}
                <div className="hidden sm:block">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  </div>
                  <div className="space-y-1 mb-4">
                    <p className="text-3xl font-bold text-gray-900">{dashboardData.stats.totalCollections}</p>
                    <p className="text-sm text-gray-600">Collections</p>
                  </div>
                  <Link href={`/orgs/${orgId}/collections`} className="text-xs text-orange-600 hover:text-orange-700 font-medium">
                    View All →
                  </Link>
                </div>
              </div>
            </div>


            {/* Quick Actions, Recent Base Pages & Recent Posts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Quick Actions - Pages removed, keep Posts */}
              <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 ${
                activeTab === 'posts' || activeTab === 'stats' ? 'sm:block hidden' : ''
              } ${activeTab === 'all' || activeTab === 'actions' ? 'block' : 'hidden sm:block'}`}>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">Quick Actions</h2>
                <div className="flex flex-col -mx-4 sm:-mx-6 lg:mx-0">
                  <Link
                    href={`/orgs/${orgId}/posts`}
                    className="flex items-center gap-3 py-4 hover:bg-gray-50 transition-colors group lg:rounded-lg lg:border lg:border-gray-200 lg:p-4"
                  >
                    <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors ml-4 sm:ml-6 lg:ml-0">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div className="flex-1 px-4 sm:px-6 lg:px-0">
                      <p className="font-medium text-gray-900">Create New Post</p>
                      <p className="text-sm text-gray-500">Share updates with your team</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors px-4 sm:px-6 lg:px-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>

              {/* Recent Base Pages hidden - AtomicFuel BASE mode */}

              {/* Recent Posts */}
              <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 ${
                activeTab === 'actions' || activeTab === 'stats' ? 'sm:block hidden' : ''
              } ${activeTab === 'all' || activeTab === 'posts' ? 'block' : 'hidden sm:block'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Recent Posts</h2>
                  <Link href={`/orgs/${orgId}/posts`} className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View All →
                  </Link>
                </div>
                {dashboardData.recentPosts.length > 0 ? (
                  <div className="flex flex-col -mx-4 sm:-mx-6 lg:mx-0">
                    {dashboardData.recentPosts.map((post, index) => (
                      <Link
                        key={post.id}
                        href={`/orgs/${orgId}/posts/${post.id}/edit`}
                        className={`block py-4 hover:bg-gray-50 transition-colors group lg:border lg:border-gray-200 lg:rounded-lg lg:p-4 ${
                          index !== dashboardData.recentPosts.length - 1 ? 'border-b border-gray-100 lg:border-b lg:border-gray-200 lg:mb-3' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between px-4 sm:px-6 lg:px-0">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 group-hover:text-green-600 transition-colors">
                              {post.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No posts yet</p>
                    <Link href={`/orgs/${orgId}/posts`} className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block">
                      Create your first post →
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
