'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { orgsApi, type Org } from '@/lib/api/orgs';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import apiClient from '@/lib/api/client';
import Link from 'next/link';

const CreateOrgSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().max(255).optional(),
  description: z.string().max(1000).optional(),
  systemTypeCode: z.string().optional(),
});

type CreateOrgInput = z.infer<typeof CreateOrgSchema>;

export default function OrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [canCreateOrg, setCanCreateOrg] = useState(true);
  const [orgLimit, setOrgLimit] = useState<{ currentCount: number; maxAllowed: number | null; canCreate: boolean } | null>(null);
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateOrgInput>({
    resolver: zodResolver(CreateOrgSchema),
  });

  const loadOrgs = async () => {
    try {
      // Use a custom axios instance without interceptors to avoid refresh loops
      const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
      const API_BASE_URL = isProduction 
        ? '/api/proxy'
        : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api');
      
      const axios = (await import('axios')).default;
      const directClient = axios.create({
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });
      
      const res = await directClient.get('/orgs');
      setOrgs(res.data.data);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        // Not authenticated - the dashboard layout should have already redirected
        // But if we get here, redirect as fallback
        console.log('[OrgsPage] Not authenticated');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
          return; // Don't set loading to false, let redirect happen
        }
      }
      console.error('Failed to load orgs:', err);
      setLoading(false);
    } finally {
      // Only set loading to false if we didn't redirect
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        setLoading(false);
      }
    }
  };

  const loadOrgLimit = async () => {
    try {
      // Use a custom axios instance without interceptors to avoid refresh loops
      const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
      const API_BASE_URL = isProduction 
        ? '/api/proxy'
        : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api');
      
      const axios = (await import('axios')).default;
      const directClient = axios.create({
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });
      
      const res = await directClient.get('/orgs/limit');
      setOrgLimit(res.data.data);
      setCanCreateOrg(res.data.data.canCreate);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        // Not authenticated - skip loading limit (will redirect from loadOrgs)
        return;
      }
      console.error('Failed to load org limit:', err);
      // Default to allowing creation if API fails
      setCanCreateOrg(true);
    }
  };

  useEffect(() => {
    // Only load data if we're not in the middle of a redirect
    // The dashboard layout will handle redirecting unauthenticated users
    loadOrgs();
    loadOrgLimit();
  }, []);

  const onSubmitCreate = async (data: CreateOrgInput) => {
    setCreating(true);
    setCreateError(null);

    try {
      await orgsApi.create(data);
      setShowCreateModal(false);
      reset();
      loadOrgs();
    } catch (err: any) {
      setCreateError(err.response?.data?.error?.message || 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-gray-600">Loading organizations...</div>
      </div>
    );
  }

  const invitationCount: number = 0; // TODO: Get from API

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Left Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Organizations
          </h2>
          
          <nav className="space-y-1">
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                My Organizations
              </h3>
              {orgs.length === 0 ? (
                <p className="text-sm text-gray-500">None yet</p>
              ) : (
                <div className="space-y-1">
                  {orgs.map((org) => (
                    <Link
                      key={org.id}
                      href={`/orgs/${org.id}/dashboard`}
                      className="block py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                    >
                      {org.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Quick Actions
              </h3>
              <button
                onClick={() => setShowJoinModal(true)}
                className="w-full text-left py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              >
                Join with Code
              </button>
            </div>

            {/* Super Admin Section */}
            {!superAdminLoading && isSuperAdmin && (
              <div className="mb-6 pt-6 border-t border-gray-200">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Super Admin
                </h3>
                <div className="space-y-1">
                  <Link
                    href="/admin/styles"
                    className="block py-2 px-3 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors font-medium"
                  >
                    Site-Wide Styles
                  </Link>
                </div>
              </div>
            )}

            {/* Invitations - Hidden for now */}
            {/* <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Invitations
              </h3>
              <div className="py-2 text-sm text-gray-500">
                {invitationCount === 0 ? 'None' : `${invitationCount} pending`}
              </div>
            </div> */}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header with Create Button */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
            {canCreateOrg && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                + Create
              </button>
            )}
            {!canCreateOrg && orgLimit && (
              <div className="text-sm text-gray-500">
                Limit reached ({orgLimit.currentCount}/{orgLimit.maxAllowed})
              </div>
            )}
          </div>

          {/* Summary Bar */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-6">
            <p className="text-sm text-gray-600">
              You belong to <span className="font-semibold">{orgs.length}</span> organization{orgs.length !== 1 ? 's' : ''}
              {/* • <span className="font-semibold">{invitationCount}</span> invitation{invitationCount !== 1 ? 's' : ''} */}
            </p>
          </div>

          {/* Main Content Card */}
          <div className="bg-white rounded-lg border border-gray-200">
            {orgs.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Welcome to Organizations!
                </h2>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  You can create or join organizations to collaborate with your team.
                </p>
                <div className="flex gap-3 justify-center">
                  {canCreateOrg && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Organization
                    </button>
                  )}
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="px-6 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Join Organization
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Organizations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orgs.map((org) => (
                    <Link
                      key={org.id}
                      href={`/orgs/${org.id}/dashboard`}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <h3 className="font-semibold text-gray-900 mb-1">{org.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">{org.slug}</p>
                      {org.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{org.description}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Inline Invitations Section - Hidden for now */}
            {/* {invitationCount > 0 && (
              <div className="border-t border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Invitations ({invitationCount})
                </h3>
                <p className="text-sm text-gray-500">You have pending invitations</p>
              </div>
            )} */}
          </div>
        </div>
      </main>

      {/* Create Organization Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Create Organization</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit(onSubmitCreate)} className="p-6">
              {createError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {createError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Name *
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    id="name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="My Organization"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                    Slug (optional)
                  </label>
                  <input
                    {...register('slug')}
                    type="text"
                    id="slug"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="my-organization"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Auto-generated from name if not provided
                  </p>
                  {errors.slug && (
                    <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    {...register('description')}
                    id="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="What is this organization about?"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="systemTypeCode" className="block text-sm font-medium text-gray-700 mb-1">
                    System Type (optional)
                  </label>
                  <select
                    {...register('systemTypeCode')}
                    id="systemTypeCode"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Start from Scratch</option>
                    <option value="content-management">Content Management (Posts, Pages)</option>
                    <option value="blank">Blank (No apps)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Choose a system type to automatically install recommended apps
                  </p>
                  {errors.systemTypeCode && (
                    <p className="mt-1 text-sm text-red-600">{errors.systemTypeCode.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    reset();
                    setCreateError(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Organization Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Join Organization</h2>
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinCode('');
                    setJoinError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!joinCode.trim()) return;

                setJoining(true);
                setJoinError(null);

                try {
                  await orgsApi.joinWithCode(joinCode.trim().toUpperCase());
                  setShowJoinModal(false);
                  setJoinCode('');
                  loadOrgs();
                } catch (err: any) {
                  setJoinError(err.response?.data?.error?.message || 'Failed to join organization');
                } finally {
                  setJoining(false);
                }
              }}
              className="p-6"
            >
              {joinError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {joinError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="joinCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Join Code
                  </label>
                  <input
                    type="text"
                    id="joinCode"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ORG-XXXXXX"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    disabled={joining}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter the join code provided by the organization administrator
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowJoinModal(false);
                      setJoinCode('');
                      setJoinError(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={joining}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={joining || !joinCode.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {joining ? 'Joining...' : 'Join'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
