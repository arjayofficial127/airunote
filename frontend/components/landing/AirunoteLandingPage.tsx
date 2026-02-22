/**
 * Landing Page Component
 * Main landing page for airunote
 */

'use client';

import Link from 'next/link';
import { AmbientBackground } from '@/components/ui/AmbientBackground';

export function AirunoteLandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50 text-gray-900">
      {/* Ambient background with golden nuggets, noise, grid, and gradient */}
      <AmbientBackground />

      <header className="relative border-b border-gray-200/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight">airunote</span>
          </div>

          <Link
            href="/login"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="relative">
        {/* Hero Section */}
        <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Multi-Organization
              <br />
              <span className="text-blue-600">Workspace Engine</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              A minimal, extensible backend foundation for building multi-org SaaS products.
              Generic, fork-ready, and product-agnostic.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/login"
                className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Get Started
              </Link>
              <Link
                href="#features"
                className="text-sm font-semibold leading-6 text-gray-900 hover:text-gray-700"
              >
                Learn more <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need to build
            </h2>
            <p className="mt-2 text-lg leading-8 text-gray-600">
              A complete backend foundation with multi-org support, authentication, and content primitives.
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3">
            <div className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-gray-200/80 backdrop-blur">
              <h3 className="text-lg font-semibold text-gray-900">Multi-Organization</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Built-in support for multiple organizations with role-based access control and team management.
              </p>
            </div>
            <div className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-gray-200/80 backdrop-blur">
              <h3 className="text-lg font-semibold text-gray-900">Content Primitives</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Posts, comments, likes, attachments, and generic collections for flexible data modeling.
              </p>
            </div>
            <div className="rounded-2xl bg-white/80 p-8 shadow-sm ring-1 ring-gray-200/80 backdrop-blur">
              <h3 className="text-lg font-semibold text-gray-900">Extensible</h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Generic, fork-ready architecture that adapts to your product needs without vendor lock-in.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="mt-2 text-lg leading-8 text-gray-600">
              Sign in to access your workspace or create a new account.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/login"
                className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-500"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
