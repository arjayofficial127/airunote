'use client';

import Link from 'next/link';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { AirunoteLogo } from '@/components/brand/AirunoteLogo';

export default function ForgotPasswordPage() {
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

            <div className="rounded-[28px] border border-gray-200/70 bg-white/88 p-8 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-10">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-[2.2rem]">
                Forgot your password?
              </h1>
              <p className="mt-3 text-base text-gray-600">
                Self-serve password reset is not available yet in this build.
              </p>
              <p className="mt-4 text-sm leading-6 text-gray-500">
                Return to sign in, or create a new account if you were trying to access a fresh workspace.
              </p>

              <div className="mt-8 flex flex-col gap-3">
                <Link
                  href="/login"
                  className="w-full rounded-2xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-500 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                >
                  Back to sign in
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
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