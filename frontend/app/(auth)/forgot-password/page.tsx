'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { AirunoteLogo } from '@/components/brand/AirunoteLogo';
import {
  authApi,
  RequestPasswordResetSchema,
  type RequestPasswordResetInput,
} from '@/lib/api/auth';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<RequestPasswordResetInput>({
    resolver: zodResolver(RequestPasswordResetSchema),
  });

  useEffect(() => {
    setFocus('email');
  }, [setFocus]);

  const onSubmit = async (data: RequestPasswordResetInput) => {
    setLoading(true);
    setError(null);

    try {
      await authApi.requestPasswordReset(data);
      setSubmitted(true);
    } catch {
      setError('We could not process that request right now. Please try again in a moment.');
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
                background: 'radial-gradient(60% 50% at 50% 50%, rgba(30, 58, 139, 0.072), transparent 70%)',
              }}
            />

            <div className="rounded-[28px] border border-gray-200/75 bg-white/92 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-10">
              <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-[2.6rem]">
                  Reset your password.
                </h1>
                <p className="mt-3 text-base text-gray-600">
                  Enter the email you use for AiruNote and we&apos;ll send reset instructions if an account exists.
                </p>
              </div>

              {submitted ? (
                <div className="space-y-6 text-center">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-800">
                    If an account exists for that email, we&apos;ve sent password reset instructions.
                  </div>
                  <p className="text-sm leading-6 text-gray-500">
                    Check your inbox and spam folder for a secure reset link. You can safely return to sign in at any time.
                  </p>
                  <div className="flex flex-col gap-3">
                    <Link
                      href="/login"
                      className="w-full rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-500 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                    >
                      Back to sign in
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false);
                        setError(null);
                      }}
                      className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
                    >
                      Try another email
                    </button>
                  </div>
                </div>
              ) : (
                <>
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
                      {errors.email && (
                        <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-500 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? 'Sending instructions...' : 'Send reset instructions'}
                    </button>
                  </form>

                  <div className="mt-6 border-t border-gray-200/90 pt-5 text-center text-sm text-gray-500">
                    Remembered it?{' '}
                    <Link
                      href="/login"
                      className="font-medium text-blue-600 underline decoration-blue-200 underline-offset-4 transition-colors hover:text-blue-700 hover:decoration-blue-500"
                    >
                      Sign in
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}