'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { orgsApi, type Org } from '@/lib/api/orgs';
import JoinCodeSettings from '@/components/orgs/JoinCodeSettings';
import { useOrgPermissions } from '@/hooks/useOrgPermissions';
import UnauthorizedError from '@/components/errors/UnauthorizedError';

const UpdateOrgSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

type UpdateOrgInput = z.infer<typeof UpdateOrgSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const orgSession = useOrgSession();
  const orgId = orgSession.activeOrgId;
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Check admin permissions
  const { isAdmin, loading: permissionsLoading } = useOrgPermissions(orgId);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<UpdateOrgInput>({
    resolver: zodResolver(UpdateOrgSchema),
  });

  useEffect(() => {
    // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
    if (!orgId) {
      setLoading(false);
      return;
    }
    // Only load org data if user is admin
    if (!permissionsLoading && isAdmin) {
      // Use org data from OrgSessionProvider instead of direct API call
      if (orgSession.activeOrg) {
        setOrg(orgSession.activeOrg);
        reset({
          name: orgSession.activeOrg.name,
          description: orgSession.activeOrg.description || '',
        });
        setLoading(false);
      } else if (orgSession.status === 'ready') {
        // Org not loaded yet, trigger refetch
        orgSession.refetch().then(() => {
          if (orgSession.activeOrg) {
            setOrg(orgSession.activeOrg);
            reset({
              name: orgSession.activeOrg.name,
              description: orgSession.activeOrg.description || '',
            });
          }
          setLoading(false);
        }).catch((err) => {
          console.error('Failed to load org:', err);
          setError('Failed to load organization');
          setLoading(false);
        });
      }
    } else if (!permissionsLoading && !isAdmin) {
      setLoading(false);
    }
  }, [orgId, reset, permissionsLoading, isAdmin, orgSession]);

  const onSubmit = async (data: UpdateOrgInput) => {
    // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
    if (!orgId) {
      setError('No active organization');
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await orgsApi.update(orgId, data);
      setSuccess(true);
      // Refresh org data from OrgSessionProvider after update
      await orgSession.refetch();
      if (orgSession.activeOrg) {
        setOrg(orgSession.activeOrg);
      }
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update organization');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
    if (!orgId) return;
    if (
      !confirm(
        'Are you sure you want to delete this organization? This will delete all posts, comments, and attachments. This action cannot be undone.'
      )
    ) {
      return;
    }

    if (!confirm('This is your final warning. Type DELETE to confirm.')) {
      return;
    }

    try {
      await orgsApi.delete(orgId);
      router.push('/orgs');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete organization');
    }
  };

  // Check permissions - show error if not admin
  if (permissionsLoading) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Checking permissions...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <UnauthorizedError 
        statusCode={403} 
        message="You do not have permission to access settings. Admin role is required." 
      />
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-8">
        <div className="text-red-600">Organization not found</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Organization Settings</h1>

      <div className="space-y-6">
        {/* Update Form */}
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">General Information</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
              Organization updated successfully!
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Organization Name *
              </label>
              <input
                {...register('name')}
                type="text"
                id="name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                {...register('description')}
                id="description"
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
              )}
            </div>


            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Join Code Settings */}
        {orgId && (
          <JoinCodeSettings
            orgId={orgId}
            joinCode={org.joinCode || null}
            isActive={org.joinCodeIsActive || false}
            maxUses={org.joinCodeMaxUses || null}
            usedCount={org.joinCodeUsedCount || 0}
            allowedDomains={org.joinCodeAllowedDomains || []}
            expiresAt={org.joinCodeExpiresAt || null}
            defaultRoleId={org.joinCodeDefaultRoleId || 2}
            roles={[
              { id: 1, name: 'Admin', code: 'ADMIN' },
              { id: 2, name: 'Member', code: 'MEMBER' },
              { id: 3, name: 'Viewer', code: 'VIEWER' },
            ]}
            onUpdate={async () => {
              // Guard: activeOrgId is SINGLE SOURCE OF TRUTH - must be non-null for API calls
              if (!orgId) return;
              // Refresh org data from OrgSessionProvider after update
              await orgSession.refetch();
              if (orgSession.activeOrg) {
                setOrg(orgSession.activeOrg);
              }
            }}
          />
        )}

        {/* Danger Zone */}
        <div className="bg-white rounded-lg shadow p-8 border-2 border-red-200">
          <h2 className="text-xl font-semibold text-red-900 mb-4">Danger Zone</h2>
          <p className="text-sm text-gray-600 mb-4">
            Once you delete an organization, there is no going back. Please be certain.
          </p>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Delete Organization
          </button>
        </div>
      </div>
    </div>
  );
}


