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

const VerifySchema = z.object({
  code: z.string().regex(/^\d{8}$/, 'Enter the 8-digit verification code'),
});

type VerifyInput = z.infer<typeof VerifySchema>;
const setupTokenStorageKey = (registrationSessionId: string) =>
  `airunote_registration_setup_token:${registrationSessionId}`;

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const email = useMemo(() => searchParams.get('email')?.trim() || '', [searchParams]);
  const registrationSessionId = useMemo(
    () => searchParams.get('registrationSessionId')?.trim() || '',
    [searchParams]
  );

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [authLoading, isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerifyInput>({
    resolver: zodResolver(VerifySchema),
  });

  const onSubmit = async (data: VerifyInput) => {
    if (!email || !registrationSessionId) {
      setError('Missing verification email. Register again to continue.');
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const response = await authApi.verifyRegistration({
        registrationSessionId,
        email,
        code: data.code,
      });
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem(
          setupTokenStorageKey(response.data.registrationSessionId),
          response.data.setupToken
        );
      }
      router.push(
        `/complete-registration?email=${encodeURIComponent(email)}&registrationSessionId=${encodeURIComponent(
          registrationSessionId
        )}`
      );
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || !registrationSessionId) {
      setError('Missing verification email. Register again to continue.');
      return;
    }

    setResending(true);
    setError(null);
    setInfo(null);

    try {
      await authApi.resendRegistrationCode({ registrationSessionId, email });
      setInfo(`A new 8-digit code was sent to ${email}.`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'We could not send your verification code. Please try again.');
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
                  Verify your account.
                </h1>
                <p className="mt-3 text-base text-gray-600">
                  Enter the 8-digit code sent to {email || 'your email'}.
                </p>
              </div>

              <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm leading-6 text-slate-600">
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
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center text-2xl font-semibold tracking-[0.35em] text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {errors.code && <p className="mt-2 text-sm text-red-600">{errors.code.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading || !email || !registrationSessionId}
                  className="w-full rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-500 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify and continue'}
                </button>
              </form>

              <div className="mt-6 flex items-center justify-between gap-4 border-t border-gray-200/90 pt-5 text-sm text-gray-500">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending || !email || !registrationSessionId}
                  className="font-medium text-blue-600 underline decoration-blue-200 underline-offset-4 transition-colors hover:text-blue-700 hover:decoration-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resending ? 'Sending new code...' : 'Request new code'}
                </button>
                <Link
                  href="/login"
                  className="font-medium text-blue-600 underline decoration-blue-200 underline-offset-4 transition-colors hover:text-blue-700 hover:decoration-blue-500"
                >
                  Sign in instead
                </Link>
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