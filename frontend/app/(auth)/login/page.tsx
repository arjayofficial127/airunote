'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi, LoginSchema, type LoginInput } from '@/lib/api/auth';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { AmbientBackground } from '@/components/ui/AmbientBackground';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in (same logic as landing page)
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Redirect to dashboard, which will intelligently route based on org count and super admin status
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setLoading(true);
    setError(null);

    try {
      await authApi.login(data);
      
      // Redirect to dashboard (which will intelligently route based on org count and super admin status)
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking auth status
  if (authLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gray-50 text-gray-900">
        <AmbientBackground />
        <div className="relative flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-gray-600 mb-2">Checking authentication...</div>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show login form if already authenticated (will redirect)
  if (isAuthenticated) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gray-50 text-gray-900">
        <AmbientBackground />
        <div className="relative flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-gray-600 mb-2">Redirecting to dashboard...</div>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-50 text-gray-900">
      {/* Ambient background with golden nuggets, noise, grid, and gradient */}
      <AmbientBackground />

      <div className="relative flex items-center justify-center min-h-screen px-4">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg" style={{ opacity: 0.88 }}>
          <div>
            <h2 className="text-3xl font-bold text-center text-gray-900">Sign in</h2>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  id="email"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  {...register('password')}
                  type="password"
                  id="password"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-[0_0_15px_rgba(20,184,166,0.4),0_0_30px_rgba(20,184,166,0.25),inset_0_0_15px_rgba(255,255,255,0.1)] text-sm font-semibold text-white overflow-hidden group focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition-colors"
              style={{
                background: 'linear-gradient(to bottom right, rgba(13, 148, 136, 0.88), rgba(20, 184, 166, 0.88), rgba(34, 211, 238, 0.88))',
              }}
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
              {/* Gold corner accents */}
              <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full opacity-70 blur-[2px]" />
              <div className="absolute bottom-0.5 left-0.5 w-1 h-1 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full opacity-60 blur-[2px]" />
              {/* Animated glow pulse */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-jade-glow bg-[radial-gradient(circle_at_center,rgba(20,184,166,0.4)_0%,transparent_70%)]"
              />
              {/* Additional inner glow for depth */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-50" />
              {/* Text with slight glow */}
              <span className="relative z-10 drop-shadow-[0_0_6px_rgba(0,0,0,0.3)]">
                {loading ? 'Signing in...' : 'Sign in'}
              </span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

