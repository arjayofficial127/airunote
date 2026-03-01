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

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, authLoading, router]);

  // Autofocus email input
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const emailInput = document.getElementById('email') as HTMLInputElement;
      if (emailInput) {
        emailInput.focus();
      }
    }
  }, [authLoading, isAuthenticated]);

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
      
      // Verify token was stored before redirecting
      const { tokenStorage } = await import('@/lib/api/token');
      const token = tokenStorage.getToken();
      
      if (!token) {
        setError('Login succeeded but token was not stored. Please try again.');
        setLoading(false);
        return;
      }
      
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle Enter key submission
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSubmit(onSubmit)();
    }
  };

  // Show loading while checking auth status
  if (authLoading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-white text-gray-900">
        <AmbientBackground 
          gridSize={64} 
          lightCount={0} 
          enableGrain={false}
          gradientOpacity={0.08}
        />
        <div className="relative flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-gray-600 mb-2">Checking authentication...</div>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show login form if already authenticated (will redirect)
  if (isAuthenticated) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-white text-gray-900">
        <AmbientBackground 
          gridSize={64} 
          lightCount={0} 
          enableGrain={false}
          gradientOpacity={0.08}
        />
        <div className="relative flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-gray-600 mb-2">Redirecting...</div>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-gray-900">
      {/* Ambient background - same as landing page */}
      <AmbientBackground 
        gridSize={64} 
        lightCount={0} 
        enableGrain={false}
        gradientOpacity={0.08}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-gray-200/50 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-base font-semibold tracking-tight text-gray-900">airunote</span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Back
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:py-24 lg:py-32">
          {/* Split Layout: Desktop (≥1024px) */}
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left Side: Tagline (Desktop only) */}
              <div className="hidden lg:block">
                <div className="relative">
                  {/* Soft radial gradient behind text */}
                  <div 
                    className="absolute inset-0 -z-10"
                    style={{
                      background: 'radial-gradient(60% 50% at 50% 50%, rgba(59, 130, 246, 0.08), transparent 70%)',
                    }}
                  />
                  <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                    Write clearly.
                    <br />
                    <span className="text-blue-600">Organize deeply.</span>
                  </h1>
                  <p className="mt-6 text-lg leading-8 text-gray-600">
                    A calm, structured workspace for your ideas.
                  </p>
                </div>
              </div>

              {/* Right Side: Login Form */}
              <div className="w-full max-w-md mx-auto lg:mx-0">
                <div className="relative">
                  {/* Soft radial gradient behind form */}
                  <div 
                    className="absolute inset-0 -z-10"
                    style={{
                      background: 'radial-gradient(60% 50% at 50% 50%, rgba(59, 130, 246, 0.06), transparent 70%)',
                    }}
                  />

                  {/* Mobile: Show tagline above form */}
                  <div className="lg:hidden mb-8 text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                      Welcome back.
                    </h1>
                    <p className="mt-4 text-base text-gray-600">
                      Sign in to continue your workspace.
                    </p>
                  </div>

                  {/* Desktop: Show welcome message */}
                  <div className="hidden lg:block mb-8">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                      Welcome back.
                    </h2>
                    <p className="mt-2 text-base text-gray-600">
                      Sign in to continue your workspace.
                    </p>
                  </div>

                  <form 
                    className="space-y-6" 
                    onSubmit={handleSubmit(onSubmit)}
                    onKeyDown={handleKeyDown}
                  >
                    {/* Error Message */}
                    {error && (
                      <div className="text-sm text-red-600 text-center">
                        {error}
                      </div>
                    )}

                    {/* Email Input */}
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
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150 placeholder:text-gray-400"
                      />
                      {errors.email && (
                        <p className="mt-2 text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>

                    {/* Password Input */}
                    <div>
                      <label htmlFor="password" className="sr-only">
                        Password
                      </label>
                      <input
                        {...register('password')}
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        placeholder="Password"
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-150 placeholder:text-gray-400"
                      />
                      {errors.password && (
                        <p className="mt-2 text-sm text-red-600">{errors.password.message}</p>
                      )}
                    </div>

                    {/* Sign In Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-lg bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-150 hover:bg-blue-500 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                  </form>

                  {/* Maintenance Notice */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="text-center">
                      <strong className="block mb-1.5 text-sm font-semibold text-gray-700">
                        System Maintenance Notice
                      </strong>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        Account registration is temporarily unavailable. Please try again later.
                      </p>
                    </div>
                  </div>

                  {/* Footer Links - Temporarily Hidden */}
                  {/* <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-sm">
                    <Link
                      href="/forgot-password"
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Forgot password?
                    </Link>
                    <span className="hidden sm:inline text-gray-300">•</span>
                    <Link
                      href="/register"
                      className="text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      Create account
                    </Link>
                  </div> */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
