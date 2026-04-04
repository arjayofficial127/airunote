'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi, LoginSchema, type LoginInput } from '@/lib/api/auth';
import { useAuth } from '@/hooks/useAuth';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { AirunoteLogo } from '@/components/brand/AirunoteLogo';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, refetch } = useAuth();
  const orgSession = useOrgSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated && orgSession.status === 'ready') {
      if (orgSession.orgs.length === 0) {
        router.push('/orgs');
      } else if (orgSession.activeOrgId) {
        router.push(`/orgs/${orgSession.activeOrgId}/airunote`);
      } else {
        router.push('/dashboard');
      }
    }
  }, [isAuthenticated, authLoading, orgSession.status, orgSession.orgs.length, orgSession.activeOrgId, router]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const emailInput = document.getElementById('email') as HTMLInputElement | null;
      if (emailInput) {
        emailInput.focus();
      }
    }
  }, [authLoading, isAuthenticated]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    setError(null);

    try {
      await authApi.login(data);

      const { tokenStorage } = await import('@/lib/api/token');
      const token = tokenStorage.getToken();

      if (!token) {
        setError('Login succeeded but token was not stored. Please try again.');
        setLoading(false);
        return;
      }

      try {
        const bootstrapResponse = await authApi.bootstrap();

        if (bootstrapResponse.success && typeof window !== 'undefined') {
          const { user, orgs, activeOrgId } = bootstrapResponse.data;

          window.sessionStorage.setItem('airunote_bootstrap_user', JSON.stringify(user));
          window.sessionStorage.setItem(
            'airunote_bootstrap_orgs',
            JSON.stringify({ orgs, activeOrgId })
          );

          await refetch();

          if (orgs.length === 0) {
            router.push('/orgs');
          } else if (activeOrgId) {
            router.push(`/orgs/${activeOrgId}/airunote`);
          } else {
            router.push('/orgs');
          }
        } else {
          router.push('/dashboard');
        }
      } catch (bootstrapError) {
        console.error('[LoginPage] Bootstrap failed, falling back to /dashboard:', bootstrapError);
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit(onSubmit)();
    }
  };

  if (authLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-white text-gray-900">
        <AmbientBackground
          gridSize={64}
          lightCount={0}
          enableGrain={false}
          gradientOpacity={0.08}
        />
        <div className="relative flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-2 text-gray-600">Checking authentication...</div>
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-white text-gray-900">
        <AmbientBackground
          gridSize={64}
          lightCount={0}
          enableGrain={false}
          gradientOpacity={0.08}
        />
        <div className="relative flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mb-2 text-gray-600">Redirecting...</div>
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-gray-900">
      <AmbientBackground
        gridSize={64}
        lightCount={0}
        enableGrain={false}
        gradientOpacity={0.08}
      />

      <main className="relative flex min-h-screen items-center justify-center px-6 py-16 sm:px-8 sm:py-24">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <AirunoteLogo
              href="/"
              iconSize={28}
              className="inline-flex items-center gap-3"
              textClassName="text-lg font-semibold tracking-tight text-gray-900"
            />
          </div>

          <div className="relative">
            <div
              className="absolute inset-0 -z-10"
              style={{
                background: 'radial-gradient(60% 50% at 50% 50%, rgba(30, 58, 139, 0.08), transparent 70%)',
              }}
            />

            <div className="rounded-[28px] border border-gray-200/70 bg-white/88 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-10">
              <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-[2.6rem]">
                  Welcome back.
                </h1>
                <p className="mt-3 text-base text-gray-600">
                  Sign in to continue to your workspace.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit(onSubmit)} onKeyDown={handleKeyDown}>
                {error && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="sr-only">
                    Email
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    id="email"
                    autoComplete="email"
                    placeholder="Email"
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    {...register('password')}
                    type="password"
                    id="password"
                    autoComplete="current-password"
                    placeholder="Password"
                    className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {errors.password && (
                    <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-500 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <div className="mt-6 border-t border-gray-200 pt-5 text-center text-sm text-gray-500">
                Don&apos;t have an account?{' '}
                <Link
                  href="/register"
                  className="font-medium text-gray-900 transition-colors hover:text-blue-600"
                >
                  Create an account
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
