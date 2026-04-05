'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  authApi,
  CompleteRegistrationSchema,
  type CompleteRegistrationInput,
} from '@/lib/api/auth';
import { useAuth } from '@/hooks/useAuth';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { AirunoteLogo } from '@/components/brand/AirunoteLogo';

const setupTokenStorageKey = (registrationSessionId: string) =>
  `airunote_registration_setup_token:${registrationSessionId}`;

function CompleteRegistrationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading, refetch } = useAuth();
  const orgSession = useOrgSession();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [setupToken, setSetupToken] = useState('');
  const email = useMemo(() => searchParams.get('email')?.trim() || '', [searchParams]);
  const registrationSessionId = useMemo(
    () => searchParams.get('registrationSessionId')?.trim() || '',
    [searchParams]
  );

  useEffect(() => {
    if (!registrationSessionId || typeof window === 'undefined') {
      setSetupToken('');
      return;
    }

    const storedSetupToken = window.sessionStorage.getItem(
      setupTokenStorageKey(registrationSessionId)
    );
    setSetupToken(storedSetupToken || '');
  }, [registrationSessionId]);

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
  }, [authLoading, isAuthenticated, orgSession.status, orgSession.orgs.length, orgSession.activeOrgId, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompleteRegistrationInput>({
    resolver: zodResolver(CompleteRegistrationSchema),
    values: {
      email,
      name: '',
      password: '',
      confirmPassword: '',
    },
  });

  const finishAuthenticatedRedirect = async () => {
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
      return;
    }

    router.push('/dashboard');
  };

  const onSubmit = async (data: CompleteRegistrationInput) => {
    if (!email || !registrationSessionId || !setupToken) {
      setError('Missing verification email. Start registration again to continue.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.completeRegistration({
        registrationSessionId,
        setupToken,
        email,
        name: data.name,
        password: data.password,
      });
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(setupTokenStorageKey(registrationSessionId));
      }
      await finishAuthenticatedRedirect();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Could not complete registration');
    } finally {
      setLoading(false);
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
          <div className="relative">
            <div
              className="absolute inset-0 -z-10"
              style={{
                background: 'radial-gradient(60% 50% at 50% 50%, rgba(30, 58, 139, 0.072), transparent 70%)',
              }}
            />

            <div className="rounded-[28px] border border-gray-200/75 bg-white/92 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-10">
              <div className="mb-8 text-center">
                <div className="mb-4 flex justify-center">
                  <AirunoteLogo
                    href="/"
                    iconSize={46}
                    className="inline-flex flex-col items-center gap-2"
                    textClassName="text-sm font-semibold tracking-tight text-gray-700"
                  />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-[2.6rem]">
                  Complete your account.
                </h1>
                <p className="mt-3 text-base text-gray-600">
                  Set your name and password for {email || 'your email'}.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
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
                    readOnly
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-500"
                  />
                  {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
                </div>

                <div>
                  <label htmlFor="name" className="sr-only">
                    Name
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    id="name"
                    placeholder="Name"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>}
                </div>

                <div>
                  <label htmlFor="password" className="sr-only">
                    Password
                  </label>
                  <input
                    {...register('password')}
                    type="password"
                    id="password"
                    autoComplete="new-password"
                    placeholder="Password"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="sr-only">
                    Confirm password
                  </label>
                  <input
                    {...register('confirmPassword')}
                    type="password"
                    id="confirmPassword"
                    autoComplete="new-password"
                    placeholder="Confirm password"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {errors.confirmPassword && (
                    <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !email || !registrationSessionId || !setupToken}
                  className="w-full rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Completing registration...' : 'Continue'}
                </button>
              </form>

              <div className="mt-6 border-t border-gray-200/90 pt-5 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-medium text-blue-600 underline decoration-blue-200 underline-offset-4 transition-colors hover:text-blue-700 hover:decoration-blue-500"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CompleteRegistrationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-gray-600">Loading...</div>
        </div>
      }
    >
      <CompleteRegistrationForm />
    </Suspense>
  );
}