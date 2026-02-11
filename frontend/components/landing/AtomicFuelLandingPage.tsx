'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AmbientBackground } from '@/components/ui/AmbientBackground';

const phrases = [
  'Manage your workspace',
  'Organize content',
  'Collaborate with teams',
];

function AnimatedHeadline() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<'visible' | 'fading-out' | 'fading-in'>('visible');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    if (prefersReducedMotion) return;

    const cycle = () => {
      // Hold visible for 1700ms
      const holdTimer = setTimeout(() => {
        setPhase('fading-out');
        
        // Fade out for 280ms
        const fadeOutTimer = setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % phrases.length);
          setPhase('fading-in');
          
          // Fade in for 300ms
          const fadeInTimer = setTimeout(() => {
            setPhase('visible');
          }, 300);
          
          timeoutsRef.current.push(fadeInTimer);
        }, 280);
        
        timeoutsRef.current.push(fadeOutTimer);
      }, 1700);

      timeoutsRef.current.push(holdTimer);
    };

    // Start first cycle
    cycle();

    // Set up interval for subsequent cycles
    const interval = setInterval(() => {
      cycle();
    }, 1700 + 280 + 300);

    return () => {
      clearInterval(interval);
      timeoutsRef.current.forEach((timer) => clearTimeout(timer));
      timeoutsRef.current = [];
    };
  }, [prefersReducedMotion]);

  const currentPhrase = phrases[currentIndex];

  return (
    <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
      <div className="flex flex-col items-center">
        <span className="inline-block min-w-[22ch] sm:min-w-0 md:min-w-[28ch] text-center">
          <span
            className={`inline-block transition-all ${
              phase === 'visible'
                ? 'opacity-100 translate-y-0'
                : phase === 'fading-out'
                ? 'opacity-0 -translate-y-2 duration-[280ms]'
                : 'opacity-0 translate-y-2 duration-[300ms]'
            }`}
          >
            {currentPhrase}
          </span>
        </span>
        <span className="bg-gradient-to-r from-cyan-500 to-teal-600 bg-clip-text text-transparent">
          in minutes
        </span>
      </div>
    </h1>
  );
}

export function AtomicFuelLandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50 text-gray-900">
      {/* Ambient background with golden nuggets, noise, grid, and gradient */}
      <AmbientBackground />

      <header className="relative border-b border-gray-200/80">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight">AtomicFuel</span>
          </div>

          <Link
            href="/login"
            className="rounded-full border border-gray-200 bg-white/70 px-4 py-2 text-sm font-semibold text-cyan-600 backdrop-blur transition hover:bg-white hover:text-teal-700"
          >
            Login <span className="ml-1 opacity-70">▸</span>
          </Link>
        </div>
      </header>

      <main className="relative mx-auto flex h-[calc(100vh-73px)] w-full max-w-6xl flex-col items-center justify-center px-6 text-center">
        <AnimatedHeadline />

        <p className="mt-5 max-w-2xl text-base text-gray-600 sm:text-lg">
          A minimal, multi-organization backend foundation for building content systems.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="relative inline-flex items-center justify-center rounded-full px-4 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold text-white overflow-hidden group bg-gradient-to-br from-teal-600 via-teal-500 to-cyan-400 shadow-[0_0_15px_rgba(20,184,166,0.4),0_0_30px_rgba(20,184,166,0.25),inset_0_0_15px_rgba(255,255,255,0.1)] sm:shadow-[0_0_20px_rgba(20,184,166,0.5),0_0_40px_rgba(20,184,166,0.3),inset_0_0_20px_rgba(255,255,255,0.1)]"
          >
            {/* Animated creases/veins overlay - stone texture with dark veins */}
            <div 
              className="absolute inset-0 opacity-30 animate-jade-creases"
              style={{
                backgroundImage: `
                  linear-gradient(45deg, transparent 30%, rgba(0, 0, 0, 0.15) 30%, rgba(0, 0, 0, 0.15) 35%, transparent 35%),
                  linear-gradient(-45deg, transparent 30%, rgba(0, 0, 0, 0.12) 30%, rgba(0, 0, 0, 0.12) 35%, transparent 35%),
                  linear-gradient(60deg, transparent 40%, rgba(0, 0, 0, 0.18) 40%, rgba(0, 0, 0, 0.18) 45%, transparent 45%),
                  linear-gradient(-60deg, transparent 40%, rgba(0, 0, 0, 0.14) 40%, rgba(0, 0, 0, 0.14) 45%, transparent 45%),
                  linear-gradient(15deg, transparent 50%, rgba(0, 0, 0, 0.1) 50%, rgba(0, 0, 0, 0.1) 52%, transparent 52%)
                `,
                backgroundSize: '200% 200%, 150% 150%, 180% 180%, 160% 160%, 120% 120%',
              }}
            />
            {/* Gold veins/accents - animated */}
            <div 
              className="absolute inset-0 opacity-40 animate-jade-creases"
              style={{
                backgroundImage: `
                  linear-gradient(30deg, transparent 25%, rgba(212, 175, 55, 0.6) 25%, rgba(212, 175, 55, 0.6) 28%, transparent 28%),
                  linear-gradient(-30deg, transparent 35%, rgba(184, 134, 11, 0.5) 35%, rgba(184, 134, 11, 0.5) 38%, transparent 38%),
                  linear-gradient(75deg, transparent 45%, rgba(234, 179, 8, 0.4) 45%, rgba(234, 179, 8, 0.4) 47%, transparent 47%)
                `,
                backgroundSize: '180% 180%, 160% 160%, 140% 140%',
                mixBlendMode: 'overlay',
              }}
            />
            {/* Gold shimmer highlight - top edge */}
            <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-yellow-400/30 via-amber-300/20 to-transparent opacity-60" />
            {/* Gold corner accents - responsive sizes */}
            <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full opacity-70 blur-[2px] sm:blur-sm" />
            <div className="absolute bottom-0.5 left-0.5 sm:bottom-1 sm:left-1 w-1 h-1 sm:w-1.5 sm:h-1.5 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full opacity-60 blur-[2px] sm:blur-sm" />
            {/* Animated glow pulse */}
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-jade-glow bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.4)_0%,transparent_70%)]"
            />
            {/* Additional inner glow for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-50" />
            {/* Text with slight glow */}
            <span className="relative z-10 drop-shadow-[0_0_6px_rgba(0,0,0,0.3)] sm:drop-shadow-[0_0_8px_rgba(0,0,0,0.3)]">Get Started</span>
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray-500">
          <span className="rounded-full border border-gray-200 bg-white/70 px-3 py-1 backdrop-blur">
            Multi-org
          </span>
          <span className="rounded-full border border-gray-200 bg-white/70 px-3 py-1 backdrop-blur">
            Content-first
          </span>
          <span className="rounded-full border border-gray-200 bg-white/70 px-3 py-1 backdrop-blur">
            Extensible
          </span>
        </div>

        <p className="mt-8 text-xs text-gray-500">
          A clean, fork-ready backend foundation.
        </p>
      </main>
    </div>
  );
}
