/**
 * Landing Page Component
 * Main landing page for airunote
 * 
 * A calm, structured workspace for your ideas.
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { AmbientBackground } from '@/components/ui/AmbientBackground';
import { useEffect, useRef, useState } from 'react';

export function AirunoteLandingPage() {
  const productImageRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate subtle scale animation for product image
  const productScale = 1 + Math.min(scrollY * 0.0001, 0.05);

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-gray-900">
      {/* Ambient background - subtle grid only, no yellow dots */}
      <AmbientBackground 
        gridSize={64} 
        lightCount={0} 
        enableGrain={false}
        gradientOpacity={0.08}
      />

      <header className="relative z-10 border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <Image src="/airunote/airunote_logo.png" alt="" width={24} height={24} className="w-6 h-6" />
            <span className="text-base font-semibold tracking-tight text-gray-900">airunote</span>
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
        {/* 1️⃣ HERO SECTION */}
        <section className="relative mx-auto max-w-7xl px-6 py-32 sm:py-40">
          <div className="mx-auto max-w-4xl text-center">
            {/* Soft radial gradient behind text */}
            <div 
              className="absolute inset-0 -z-10"
              style={{
                background: 'radial-gradient(60% 50% at 50% 50%, rgba(59, 130, 246, 0.08), transparent 70%)',
              }}
            />
            
            <h1 className="text-6xl font-bold tracking-tight text-gray-900 sm:text-7xl md:text-8xl">
              Write clearly.
              <br />
              <span className="text-blue-600">Organize deeply.</span>
            </h1>
            
            <p className="mt-8 text-xl leading-8 text-gray-600 sm:text-2xl">
              A calm, structured workspace for your ideas.
            </p>
            
            <p className="mt-4 text-sm text-gray-500">
              Folders. Documents. Different Lenses.
            </p>
            
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
              <Link
                href="/login"
                className="rounded-lg bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-all hover:bg-blue-500 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Get Started
              </Link>
              <Link
                href="#how-it-works"
                className="text-base font-medium leading-6 text-gray-700 transition-colors hover:text-gray-900"
              >
                See how it works <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>

        {/* 2️⃣ PRODUCT VISUAL */}
        <section id="how-it-works" className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-5xl">
            <div
              ref={productImageRef}
              className="relative mx-auto overflow-hidden rounded-2xl bg-white shadow-2xl"
              style={{
                transform: `scale(${productScale})`,
                transition: 'transform 0.1s ease-out',
              }}
            >
              <Image
                src="/airunote/homepage.png"
                alt="AiruNote workspace showing folders and documents"
                width={1200}
                height={800}
                className="w-full h-auto"
                priority
              />
            </div>
            
            <p className="mt-8 text-center text-base text-gray-600">
              A file system for thinking.
            </p>
          </div>
        </section>

        {/* 3️⃣ CORE PRINCIPLES (3 COLUMNS) */}
        <section className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-8">
              <h3 className="text-xl font-semibold text-gray-900">Structured</h3>
              <p className="mt-3 text-base leading-7 text-gray-600">
                Folders and documents, organized the way your brain expects.
              </p>
            </div>
            
            <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-8">
              <h3 className="text-xl font-semibold text-gray-900">Focused</h3>
              <p className="mt-3 text-base leading-7 text-gray-600">
                No feeds. No clutter. Just your work.
              </p>
            </div>
            
            <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-8">
              <h3 className="text-xl font-semibold text-gray-900">Extensible</h3>
              <p className="mt-3 text-base leading-7 text-gray-600">
                Built to grow with you — from personal notes to team workspaces.
              </p>
            </div>
          </div>
        </section>

        {/* 4️⃣ FEATURE HIGHLIGHT (APPLE STYLE SPLIT) */}
        <section className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                Everything stays where you put it.
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-600">
                Direct folder logic. Predictable structure. No surprises.
              </p>
              
              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-900">Intuitive hierarchy</p>
                    <p className="mt-1 text-sm text-gray-600">Folders nest naturally. Documents live where you place them.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-900">Fast navigation</p>
                    <p className="mt-1 text-sm text-gray-600">Jump between folders instantly. No loading delays.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-900">Search everything</p>
                    <p className="mt-1 text-sm text-gray-600">Find any document or folder in seconds.</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <Image
                  src="/airunote/feature.png"
                  alt="AiruNote feature showing folder structure and organization"
                  width={1200}
                  height={1200}
                  className="w-full h-auto"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 5️⃣ OBSIDIAN-INSPIRED SECTION */}
        <section className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-8 py-16 sm:px-12 sm:py-20">
            <div className="text-center">
              <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Built for builders.
              </h2>
              <p className="mt-6 text-lg leading-8 text-gray-300">
                Markdown support. Keyboard-first. Fast.
              </p>
              
              <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                  <span>Markdown</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <span>Keyboard shortcuts</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span>Lightning fast</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6️⃣ FINAL CTA */}
        <section className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Start writing with structure.
            </h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Create your workspace and begin organizing your ideas today.
            </p>
            <div className="mt-10">
              <Link
                href="/login"
                className="inline-block rounded-lg bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition-all hover:bg-blue-500 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Create Workspace
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="relative border-t border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} airunote | AOTECH. A calm workspace for your ideas.
            </p>
            <div className="flex gap-6 text-sm text-gray-500">
              <Link href="/login" className="hover:text-gray-900 transition-colors">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
