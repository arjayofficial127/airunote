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
      router.push(`/verify?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed');
    } finally {
      setLoading(false);
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
            href="/login"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Sign In
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
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Public MVP</p>
                <h1 className="mt-4 text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                  Open the workspace.
                  <br />
                  <span className="text-blue-600">Verify once, continue directly.</span>
                </h1>
                <p className="mt-6 text-lg leading-8 text-gray-600">
                  Create your account, enter the 8-digit verification code, and step straight into workspace setup.
                </p>
              </div>
            </div>

            <div className="w-full max-w-md mx-auto lg:mx-0">
              <div className="relative rounded-3xl border border-gray-200/70 bg-white/85 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur-sm">
                <div className="lg:hidden mb-8 text-center">
                  <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                    Create your account.
                  </h1>
                  <p className="mt-4 text-base text-gray-600">
                    Register now, then verify with the code we send.
                  </p>
                </div>

                <div className="hidden lg:block mb-8">
                  <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                    Create your account.
                  </h2>
                  <p className="mt-2 text-base text-gray-600">
                    We will send an 8-digit verification code before workspace setup.
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
                    <label htmlFor="name" className="sr-only">
                      Name
                    </label>
                    <input
                      {...register('name')}
                      type="text"
                      id="name"
                      placeholder="Name"
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>}
                  </div>

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
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>}
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
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                      className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    {errors.confirmPassword && (
                      <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all hover:bg-blue-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? 'Creating account...' : 'Continue to verification'}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-500">
                  Already have an account?{' '}
                  <Link href="/login" className="font-medium text-gray-900 hover:text-blue-600">
                    Sign in
                  </Link>
                </p>
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

