'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi, RegisterSchema, type RegisterInput } from '@/lib/api/auth';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { AirunoteLogo } from '@/components/brand/AirunoteLogo';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [secret, setSecret] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    const secretParam = searchParams.get('secret');
    setSecret(secretParam || undefined);
  }, [searchParams]);

  useEffect(() => {
    const resumeToken = searchParams.get('resumeToken');
    if (!resumeToken) {
      return;
    }

    let cancelled = false;

    const resumeRegistration = async () => {
      setResuming(true);
      setError(null);

      try {
        const response = await authApi.resumeRegistration(resumeToken);
        if (cancelled) {
          return;
        }

        router.replace(
          `/verify?email=${encodeURIComponent(response.data.email)}&registrationSessionId=${encodeURIComponent(
            response.data.registrationSessionId
          )}`
        );
      } catch (err: any) {
        if (!cancelled) {
          setError(err.response?.data?.error?.message || 'Could not restore registration');
        }
      } finally {
        if (!cancelled) {
          setResuming(false);
        }
      }
    };

    void resumeRegistration();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  });

  const onSubmit = async (data: RegisterInput) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authApi.register(data, secret);
      const email = response.data.email || data.email;
      const registrationSessionId = response.data.registrationSessionId;
      router.push(
        `/verify?email=${encodeURIComponent(email)}&registrationSessionId=${encodeURIComponent(
          registrationSessionId || ''
        )}`
      );
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed');
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

  if (resuming) {
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
            <div className="mb-2 text-gray-600">Restoring registration...</div>
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
                  Create your account.
                </h1>
                <p className="mt-3 text-base text-gray-600">
                  Enter your email and we&apos;ll send an 8-digit verification code.
                </p>
              </div>

              {secret && (
                <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                  Invite mode is active for this link. Your access key is already attached.
                </div>
              )}

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
                    autoComplete="email"
                    placeholder="Email"
                    className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Sending code...' : 'Continue'}
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-gray-600">Loading...</div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

