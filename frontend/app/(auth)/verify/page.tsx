'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { AirunoteLogo } from '@/components/brand/AirunoteLogo';
import { authApi } from '@/lib/api/auth';
import { useAuth } from '@/hooks/useAuth';
import { useOrgSession } from '@/providers/OrgSessionProvider';

const VerifySchema = z.object({
  code: z.string().regex(/^\d{8}$/, 'Enter the 8-digit verification code'),
});

type VerifyInput = z.infer<typeof VerifySchema>;

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading, refetch } = useAuth();
  const orgSession = useOrgSession();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const email = useMemo(() => searchParams.get('email')?.trim() || '', [searchParams]);

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
  } = useForm<VerifyInput>({
    resolver: zodResolver(VerifySchema),
  });

  const completeAuthenticatedRedirect = async () => {
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

  const onSubmit = async (data: VerifyInput) => {
    if (!email) {
      setError('Missing verification email. Register again to continue.');
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      await authApi.verifyRegistration({ email, code: data.code });
      await completeAuthenticatedRedirect();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError('Missing verification email. Register again to continue.');
      return;
    }

    setResending(true);
    setError(null);
    setInfo(null);

    try {
      await authApi.resendRegistrationCode(email);
      setInfo(`A new 8-digit code was sent to ${email}.`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Could not resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-gray-900">
      <AmbientBackground
        gridSize={64}
        lightCount={0}
        enableGrain={false}
        gradientOpacity={0.08}
      />

      <header className="relative z-10 border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <AirunoteLogo href="/" />
          <Link
            href="/register"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Back to register
          </Link>
        </div>
      </header>

      <main className="relative">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:py-32">
          <div className="mx-auto max-w-6xl grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="hidden lg:block">
              <div className="relative">
                <div
                  className="absolute inset-0 -z-10"
                  style={{
                    background: 'radial-gradient(60% 50% at 50% 50%, rgba(59, 130, 246, 0.08), transparent 70%)',
                  }}
                />
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Account verification</p>
                <h1 className="mt-4 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                  Confirm once.
                  <br />
                  <span className="text-blue-600">Step straight into your workspace.</span>
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                  Enter the 8-digit code we sent to your inbox. Successful verification signs you in and routes directly to organization setup.
                </p>
              </div>
            </div>

            <div className="w-full max-w-md mx-auto lg:mx-0">
              <div className="relative rounded-3xl border border-gray-200/70 bg-white/85 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur-sm">
                <div className="hidden lg:block mb-8">
                  <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                    Verify your account.
                  </h2>
                  <p className="mt-2 text-base text-gray-600">
                    Enter the code sent to {email || 'your email'}.
                  </p>
                </div>

                <div className="lg:hidden mb-8 text-center">
                  <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                    Verify your account.
                  </h1>
                  <p className="mt-4 text-base text-gray-600">
                    Enter the 8-digit code sent to {email || 'your email'}.
                  </p>
                </div>

                <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Need a fresh code? Use resend after lockout or expiration. Verification attempts are limited for security.
                </div>

                <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
                  {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {info && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {info}
                    </div>
                  )}

                  <div>
                    <label htmlFor="code" className="sr-only">
                      Verification code
                    </label>
                    <input
                      {...register('code')}
                      type="text"
                      id="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={8}
                      placeholder="8-digit code"
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-center text-2xl font-semibold tracking-[0.35em] text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    {errors.code && <p className="mt-2 text-sm text-red-600">{errors.code.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all hover:bg-blue-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify and continue'}
                  </button>
                </form>

                <div className="mt-6 flex items-center justify-between gap-4 text-sm">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || !email}
                    className="font-medium text-gray-900 transition-colors hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {resending ? 'Sending new code...' : 'Request new code'}
                  </button>
                  <Link href="/login" className="text-gray-500 hover:text-gray-900 transition-colors">
                    Sign in instead
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-gray-600">Loading...</div>
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}