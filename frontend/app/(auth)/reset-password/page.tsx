'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  authApi,
  ResetPasswordSchema,
  type ResetPasswordFormInput,
} from '@/lib/api/auth';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { AirunoteLogo } from '@/components/brand/AirunoteLogo';

type TokenState = 'checking' | 'valid' | 'invalid';
type SubmissionState = 'idle' | 'submitting' | 'success';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token')?.trim() || '', [searchParams]);
  const [tokenState, setTokenState] = useState<TokenState>('checking');
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle');
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { errors },
  } = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(ResetPasswordSchema),
  });

  useEffect(() => {
    if (!token) {
      setTokenState('invalid');
      return;
    }

    let cancelled = false;

    const verifyToken = async () => {
      setTokenState('checking');
      setError(null);

      try {
        await authApi.verifyResetToken({ token });
        if (!cancelled) {
          setTokenState('valid');
          setFocus('newPassword');
        }
      } catch {
        if (!cancelled) {
          setTokenState('invalid');
        }
      }
    };

    void verifyToken();

    return () => {
      cancelled = true;
    };
  }, [setFocus, token]);

  const onSubmit = async (data: ResetPasswordFormInput) => {
    if (!token) {
      setTokenState('invalid');
      return;
    }

    setSubmissionState('submitting');
    setError(null);

    try {
      await authApi.resetPassword({
        token,
        newPassword: data.newPassword,
      });
      setSubmissionState('success');
    } catch {
      setTokenState('invalid');
      setError('This reset link is invalid or has expired. Request a new one to continue.');
      setSubmissionState('idle');
    }
  };

  const renderContent = () => {
    if (submissionState === 'success') {
      return (
        <div className="space-y-6 text-center">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-800">
            Your password has been reset successfully.
          </div>
          <p className="text-sm leading-6 text-gray-500">
            You can sign in now with your new password.
          </p>
          <Link
            href="/login"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-500 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Continue to sign in
          </Link>
        </div>
      );
    }

    if (tokenState === 'checking') {
      return (
        <div className="space-y-6 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-gray-900">Checking your reset link...</h2>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              This will only take a moment.
            </p>
          </div>
        </div>
      );
    }

    if (tokenState === 'invalid') {
      return (
        <div className="space-y-6 text-center">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
            This reset link is invalid or has expired.
          </div>
          <p className="text-sm leading-6 text-gray-500">
            Request a fresh password reset email and use the newest link we send.
          </p>
          <div className="flex flex-col gap-3">
            <Link
              href="/forgot-password"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-500 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            >
              Request new link
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      );
    }

    return (
      <>
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="newPassword" className="sr-only">
              New password
            </label>
            <input
              {...register('newPassword')}
              type="password"
              id="newPassword"
              autoComplete="new-password"
              placeholder="New password"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {errors.newPassword && (
              <p className="mt-2 text-sm text-red-600">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="sr-only">
              Confirm new password
            </label>
            <input
              {...register('confirmPassword')}
              type="password"
              id="confirmPassword"
              autoComplete="new-password"
              placeholder="Confirm new password"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 transition-all duration-150 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {errors.confirmPassword && (
              <p className="mt-2 text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submissionState === 'submitting'}
            className="w-full rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-500 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submissionState === 'submitting' ? 'Resetting password...' : 'Set new password'}
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
    );
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
                  Choose a new password.
                </h1>
                <p className="mt-3 text-base text-gray-600">
                  Use a strong password you haven&apos;t used elsewhere.
                </p>
              </div>

              {renderContent()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen overflow-hidden bg-white text-gray-900">
          <AmbientBackground
            gridSize={64}
            lightCount={0}
            enableGrain={false}
            gradientOpacity={0.08}
          />
          <div className="relative flex min-h-screen items-center justify-center">
            <div className="text-center">
              <div className="mb-2 text-gray-600">Loading reset flow...</div>
              <div className="flex justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
