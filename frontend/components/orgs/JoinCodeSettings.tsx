'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { orgsApi } from '@/lib/api/orgs';

const JoinCodeSettingsSchema = z.object({
  isActive: z.boolean(),
  maxUses: z.number().int().positive().nullable(),
  allowedDomains: z.array(z.string()).optional(),
  expiresAt: z.string().nullable(),
  defaultRoleId: z.number().int().positive(),
});

type JoinCodeSettingsInput = z.infer<typeof JoinCodeSettingsSchema>;

interface JoinCodeSettingsProps {
  orgId: string;
  joinCode: string | null;
  isActive: boolean;
  maxUses: number | null;
  usedCount: number;
  allowedDomains: string[];
  expiresAt: string | null;
  defaultRoleId: number;
  roles: Array<{ id: number; name: string; code: string }>;
  onUpdate: () => void;
}

export default function JoinCodeSettings({
  orgId,
  joinCode,
  isActive: initialIsActive,
  maxUses: initialMaxUses,
  usedCount,
  allowedDomains: initialAllowedDomains,
  expiresAt: initialExpiresAt,
  defaultRoleId: initialDefaultRoleId,
  roles,
  onUpdate,
}: JoinCodeSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [domainInput, setDomainInput] = useState('');
  const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<JoinCodeSettingsInput>({
    resolver: zodResolver(JoinCodeSettingsSchema),
    defaultValues: {
      isActive: initialIsActive,
      maxUses: initialMaxUses,
      allowedDomains: initialAllowedDomains,
      expiresAt: initialExpiresAt ? new Date(initialExpiresAt).toISOString().split('T')[0] : null,
      defaultRoleId: initialDefaultRoleId,
    },
  });

  const isActive = watch('isActive');
  const maxUses = watch('maxUses');
  const unlimitedUses = maxUses === null;

  const handleCopyCode = () => {
    if (joinCode) {
      navigator.clipboard.writeText(joinCode);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
  };

  const handleGenerateCode = async () => {
    if (!showGenerateConfirm) {
      setShowGenerateConfirm(true);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await orgsApi.generateJoinCode(orgId);
      onUpdate();
      setShowGenerateConfirm(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to generate code');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDomain = () => {
    const domain = domainInput.trim().toLowerCase();
    if (!domain) return;

    // Remove @ if present
    const cleanDomain = domain.replace('@', '');

    // Validate domain format (simple check)
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(cleanDomain)) {
      setError('Invalid domain format');
      return;
    }

    const current = watch('allowedDomains') || [];
    if (!current.includes(cleanDomain)) {
      setValue('allowedDomains', [...current, cleanDomain]);
    }
    setDomainInput('');
    setError(null);
  };

  const handleRemoveDomain = (domain: string) => {
    const current = watch('allowedDomains') || [];
    setValue('allowedDomains', current.filter((d) => d !== domain));
  };

  const onSubmit = async (data: JoinCodeSettingsInput) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await orgsApi.updateJoinCodeSettings(orgId, {
        isActive: data.isActive,
        maxUses: data.maxUses,
        allowedDomains: data.allowedDomains || null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
        defaultRoleId: data.defaultRoleId,
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onUpdate();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const isExpired = initialExpiresAt ? new Date(initialExpiresAt) < new Date() : false;
  const isMaxedOut = maxUses !== null && usedCount >= maxUses;
  const remainingUses = maxUses !== null ? maxUses - usedCount : null;

  // Filter out Admin role for security (users shouldn't join as admin)
  // If roles not provided, use default roles (Member=2, Viewer=3)
  const availableRoles = roles.length > 0 
    ? roles.filter((r) => r.code !== 'ADMIN')
    : [
        { id: 2, name: 'Member', code: 'MEMBER' },
        { id: 3, name: 'Viewer', code: 'VIEWER' },
      ];

  return (
    <div className="bg-white rounded-lg shadow p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Join Code</h2>
          <p className="text-sm text-gray-600 mt-1">
            Allow users to join your organization with a code
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            {...register('isActive')}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6">
          Settings updated successfully!
        </div>
      )}

      {isActive && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Current Join Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Join Code
            </label>
            {joinCode ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-lg">
                  {joinCode}
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  📋 Copy
                </button>
                {showGenerateConfirm ? (
                  <button
                    type="button"
                    onClick={handleGenerateCode}
                    disabled={loading}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {loading ? 'Generating...' : 'Confirm Regenerate'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowGenerateConfirm(true)}
                    className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition"
                  >
                    🔄 Regenerate
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGenerateCode}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate Join Code'}
              </button>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Share this code with users who want to join your organization
            </p>
          </div>

          {/* Usage Stats */}
          {joinCode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">Usage Statistics</p>
                  <p className="text-sm text-blue-700 mt-1">
                    {usedCount} {usedCount === 1 ? 'use' : 'uses'}
                    {unlimitedUses ? '' : ` of ${maxUses} maximum`}
                    {remainingUses !== null && (
                      <span className="ml-2">({remainingUses} remaining)</span>
                    )}
                  </p>
                </div>
                {isExpired && (
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">
                    Expired
                  </span>
                )}
                {isMaxedOut && !isExpired && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">
                    Maxed Out
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Max Uses */}
          <div>
            <div className="flex items-center gap-4 mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Maximum Uses
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={unlimitedUses}
                  onChange={(e) => {
                    setValue('maxUses', e.target.checked ? null : 100);
                  }}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">Unlimited</span>
              </label>
            </div>
            {!unlimitedUses && (
              <input
                type="number"
                {...register('maxUses', { valueAsNumber: true })}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            {errors.maxUses && (
              <p className="mt-1 text-sm text-red-600">{errors.maxUses.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Limit how many times this code can be used. Leave unlimited for open access.
            </p>
          </div>

          {/* Allowed Domains */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Allowed Email Domains (Optional)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDomain();
                  }
                }}
                placeholder="example.com"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddDomain}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
              >
                Add
              </button>
            </div>
            {watch('allowedDomains') && watch('allowedDomains')!.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {watch('allowedDomains')!.map((domain) => (
                  <span
                    key={domain}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    @{domain}
                    <button
                      type="button"
                      onClick={() => handleRemoveDomain(domain)}
                      className="hover:text-blue-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Restrict joining to specific email domains. Leave empty to allow any email.
            </p>
          </div>

          {/* Expiration Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiration Date (Optional)
            </label>
            <input
              type="date"
              {...register('expiresAt')}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Set when this join code should expire. Leave empty for no expiration.
            </p>
          </div>

          {/* Default Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Role for New Members
            </label>
            <select
              {...register('defaultRoleId', { valueAsNumber: true })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableRoles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              The role assigned to users who join with this code
            </p>
          </div>

          <div className="flex space-x-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      )}

      {!isActive && (
        <div className="text-center py-8 text-gray-500">
          <p>Enable join code to allow users to join your organization</p>
        </div>
      )}
    </div>
  );
}

