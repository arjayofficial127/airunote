'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { orgsApi, type Org } from '@/lib/api/orgs';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/api/client';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const CreateOrgSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  slug: z.string().max(255).optional(),
  description: z.string().max(1000).optional(),
  systemTypeCode: z.string().optional(),
});

type CreateOrgInput = z.infer<typeof CreateOrgSchema>;

export default function OrgsPage() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [canCreateOrg, setCanCreateOrg] = useState(true);
  const [orgLimit, setOrgLimit] = useState<{ currentCount: number; maxAllowed: number | null; canCreate: boolean } | null>(null);
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const { user } = useAuth();
  const router = useRouter();
  
  // Tab state for onboarding
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  
  // Inline form state for onboarding
  const [spaceName, setSpaceName] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [isSlugCustomized, setIsSlugCustomized] = useState(false);
  const [description, setDescription] = useState('');
  const [systemTypeCode, setSystemTypeCode] = useState('');
  
  // Rotating word state
  const words = ['Thoughts.', 'Projects.', 'Creativity.'];
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateOrgInput>({
    resolver: zodResolver(CreateOrgSchema),
  });

  const loadOrgs = async () => {
    try {
      // Use a custom axios instance without interceptors to avoid refresh loops
      const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
      const API_BASE_URL = isProduction 
        ? '/api/proxy'
        : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api');
      
      const axios = (await import('axios')).default;
      const directClient = axios.create({
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });
      
      const res = await directClient.get('/orgs');
      setOrgs(res.data.data);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        // Not authenticated - the dashboard layout should have already redirected
        // But if we get here, redirect as fallback
        console.log('[OrgsPage] Not authenticated');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
          return; // Don't set loading to false, let redirect happen
        }
      }
      console.error('Failed to load orgs:', err);
      setLoading(false);
    } finally {
      // Only set loading to false if we didn't redirect
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        setLoading(false);
      }
    }
  };

  const loadOrgLimit = async () => {
    try {
      // Use a custom axios instance without interceptors to avoid refresh loops
      const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost';
      const API_BASE_URL = isProduction 
        ? '/api/proxy'
        : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api');
      
      const axios = (await import('axios')).default;
      const directClient = axios.create({
        baseURL: API_BASE_URL,
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' },
      });
      
      const res = await directClient.get('/orgs/limit');
      setOrgLimit(res.data.data);
      setCanCreateOrg(res.data.data.canCreate);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 401) {
        // Not authenticated - skip loading limit (will redirect from loadOrgs)
        return;
      }
      console.error('Failed to load org limit:', err);
      // Default to allowing creation if API fails
      setCanCreateOrg(true);
    }
  };

  useEffect(() => {
    // Only load data if we're not in the middle of a redirect
    // The dashboard layout will handle redirecting unauthenticated users
    loadOrgs();
    loadOrgLimit();
  }, []);

  const onSubmitCreate = async (data: CreateOrgInput) => {
    setCreating(true);
    setCreateError(null);

    try {
      await orgsApi.create(data);
      setShowCreateModal(false);
      reset();
      // Reset inline form state
      setSpaceName('');
      setCustomSlug('');
      setIsSlugCustomized(false);
      setDescription('');
      setSystemTypeCode('');
      loadOrgs();
    } catch (err: any) {
      setCreateError(err.response?.data?.error?.message || 'Failed to create organization');
    } finally {
      setCreating(false);
    }
  };
  
  // Inline create handler for onboarding
  const handleInlineCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!spaceName.trim()) return;
    
    setCreating(true);
    setCreateError(null);
    
    try {
      const newOrg = await orgsApi.create({
        name: spaceName,
        slug: isSlugCustomized && customSlug ? customSlug : undefined,
        description: description || undefined,
        systemTypeCode: systemTypeCode || undefined,
      });
      // Reset form
      setSpaceName('');
      setCustomSlug('');
      setIsSlugCustomized(false);
      setDescription('');
      setSystemTypeCode('');
      // Redirect to newly created space
      if (newOrg?.data?.id) {
        router.push(`/orgs/${newOrg.data.id}/airunote`);
      } else {
        loadOrgs();
      }
    } catch (err: any) {
      setCreateError(err.response?.data?.error?.message || 'Failed to create base');
    } finally {
      setCreating(false);
    }
  };
  
  // Inline join handler for onboarding
  const handleInlineJoin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    
    setJoining(true);
    setJoinError(null);
    
    try {
      const result = await orgsApi.joinWithCode(joinCode.trim().toUpperCase());
      setJoinCode('');
      // Redirect to joined space
      if (result?.data?.id) {
        router.push(`/orgs/${result.data.id}/airunote`);
      } else {
        loadOrgs();
      }
    } catch (err: any) {
      setJoinError(err.response?.data?.error?.message || 'Failed to join base');
    } finally {
      setJoining(false);
    }
  };
  
  // Generate slug preview
  const getSlugPreview = () => {
    if (isSlugCustomized && customSlug) {
      return customSlug;
    }
    if (spaceName) {
      return spaceName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
    return '';
  };

  // Rotating word effect
  useEffect(() => {
    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentWordIndex((prev) => (prev + 1) % words.length);
        setIsFading(false);
      }, 150); // Fade out duration
    }, 2000); // Change every 2 seconds

    return () => clearInterval(interval);
  }, [words.length]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-gray-600">Loading organizations...</div>
      </div>
    );
  }

  return (
    <div>
      {orgs.length > 0 ? (
        // Normal layout with sidebar
        <div className="flex h-[calc(100vh-3.5rem)]">
          {/* Left Sidebar */}
          <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Organizations
              </h2>
              
              <nav className="space-y-1">
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    My Organizations
                  </h3>
                  <div className="space-y-1">
                    {orgs.map((org) => (
                      <Link
                        key={org.id}
                        href={`/orgs/${org.id}/dashboard`}
                        className="block py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        {org.name}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Quick Actions
                  </h3>
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="w-full text-left py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    Join with Code
                  </button>
                </div>

                {/* Super Admin Section */}
                {!superAdminLoading && isSuperAdmin && (
                  <div className="mb-6 pt-6 border-t border-gray-200">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Super Admin
                    </h3>
                    <div className="space-y-1">
                      <Link
                        href="/admin/styles"
                        className="block py-2 px-3 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors font-medium"
                      >
                        Site-Wide Styles
                      </Link>
                    </div>
                  </div>
                )}
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto flex flex-col">
            {/* Organizations List State */}
            <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Header with Create Button */}
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
              {canCreateOrg && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  + Create
                </button>
              )}
              {!canCreateOrg && orgLimit && (
                <div className="text-sm text-gray-500">
                  Limit reached ({orgLimit.currentCount}/{orgLimit.maxAllowed})
                </div>
              )}
            </div>

            {/* Summary Bar */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-6">
              <p className="text-sm text-gray-600">
                You belong to <span className="font-semibold">{orgs.length}</span> organization{orgs.length !== 1 ? 's' : ''}
                {/* • <span className="font-semibold">{invitationCount}</span> invitation{invitationCount !== 1 ? 's' : ''} */}
              </p>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Organizations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orgs.map((org) => (
                    <Link
                      key={org.id}
                      href={`/orgs/${org.id}/dashboard`}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
                    >
                      <h3 className="font-semibold text-gray-900 mb-1">{org.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">{org.slug}</p>
                      {org.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{org.description}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
          </main>
        </div>
      ) : (
        // Full-screen boot screen - No sidebar, no top bar
        <>
          {/* Metronome animation styles */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes swing {
              0%   { transform: rotate(-25deg); }
              100% { transform: rotate(25deg); }
            }
            .metronome-arm {
              transform-origin: 55px 90px;
              animation: swing 2s cubic-bezier(.45,.05,.55,.95) infinite alternate;
            }
          `}} />
          <div className="min-h-screen flex flex-col md:flex-row">
          {/* MOBILE: Hero Section */}
          <div className="md:hidden bg-[#1E3A8A] flex flex-col items-center justify-center px-6 py-12 min-h-[50vh] relative">
            {/* Logo - Top Left */}
            <div className="absolute top-6 left-6">
              <Link href="/dashboard" className="flex items-center gap-2">
                <Image src="/airunote/airunote_logo_white.png" alt="" width={20} height={20} className="w-5 h-5" />
                <span className="text-lg font-semibold text-white">airunote</span>
              </Link>
            </div>
            {/* User Name - Top Right */}
            {user?.name && (
              <div className="absolute top-6 right-6">
                <p className="text-sm font-medium text-white">
                  {user.name}
                </p>
              </div>
            )}
            <div className="flex flex-col items-center justify-center text-center max-w-md">
              {/* Rotating word */}
              <div className="mb-8">
                <h1 
                  className={`text-4xl font-bold text-white transition-opacity duration-150 ${
                    isFading ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  {words[currentWordIndex]}
                </h1>
              </div>
              
              {/* Triangle Metronome SVG */}
              <div className="mb-6 flex justify-center">
                <svg
                  width="75"
                  height="95"
                  viewBox="0 0 110 140"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="metronome"
                >
                  {/* Outer Triangle */}
                  <path
                    d="M31 90 L55 20 L79 90 Z"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Outer Triangle */}
                  <path
                    d="M20 120 L55 20 L90 120 Z"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Base Line */}
                  <line
                    x1="15"
                    y1="120"
                    x2="95"
                    y2="120"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  {/* Center Guide */}
                  <line
                    x1="55"
                    y1="40"
                    x2="55"
                    y2="111"
                    stroke="white"
                    strokeWidth="1.5"
                    opacity="0.7"
                  />
                  {/* Rotating Arm */}
                  <g className="metronome-arm">
                    {/* Rod */}
                    <line
                      x1="55"
                      y1="40"
                      x2="55"
                      y2="111"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    {/* Sliding Weight */}
                    <rect
                      x="48"
                      y="45"
                      width="14"
                      height="12"
                      rx="2"
                      fill="white"
                    />
                    {/* Pivot Joint (center of rotation) */}
                    <circle
                      cx="55"
                      cy="90"
                      r="3"
                      fill="white"
                    />
                    {/* Counter Weight */}
                    <circle
                      cx="55"
                      cy="111"
                      r="6"
                      fill="white"
                    />
                  </g>
                </svg>
              </div>
              
              {/* Sub text */}
              <p className="text-sm text-white opacity-85 mb-8 leading-relaxed">
                Organize it your way.
              </p>
              
              {/* Final statement */}
              <p className="text-xs text-white font-medium tracking-wider uppercase">
                EVERYTHING BEGINS WITH YOUR <span className="font-bold">BASE</span>.
              </p>
            </div>
          </div>

          {/* DESKTOP: LEFT COLUMN - Hero Section */}
          <div className="hidden md:flex w-full md:w-1/2 bg-[#1E3A8A] flex-col items-center justify-center p-12 lg:p-16 relative overflow-hidden">
            {/* Logo - Top Left */}
            <div className="absolute top-8 left-8 lg:top-12 lg:left-12">
              <Link href="/dashboard" className="flex items-center gap-2.5">
                <Image src="/airunote/airunote_logo_white.png" alt="" width={24} height={24} className="w-6 h-6" />
                <span className="text-xl font-semibold text-white">airunote</span>
              </Link>
            </div>
            {/* User Name - Top Right */}
            {user?.name && (
              <div className="absolute top-8 right-8 lg:top-12 lg:right-12">
                <p className="text-base lg:text-lg font-medium text-white">
                  {user.name}
                </p>
              </div>
            )}
            {/* Centered content */}
            <div className="flex flex-col items-center justify-center text-center max-w-lg">
              {/* Rotating word - Large Hero Heading */}
              <div className="mb-8 mt-[30px]">
                <h1 
                  className={`text-5xl lg:text-6xl xl:text-7xl font-bold text-white transition-opacity duration-150 ${
                    isFading ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  {words[currentWordIndex]}
                </h1>
              </div>
              
              {/* Triangle Metronome SVG */}
              <div className="mb-6 flex justify-center">
                <svg
                  width="480"
                  height="615"
                  viewBox="0 0 110 140"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="metronome"
                >
                  {/* Outer Triangle */}
                  <path
                    d="M31 90 L55 20 L79 90 Z"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Outer Triangle */}
                  <path
                    d="M20 120 L55 20 L90 120 Z"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Base Line */}
                  <line
                    x1="15"
                    y1="120"
                    x2="95"
                    y2="120"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  {/* Center Guide */}
                  <line
                    x1="55"
                    y1="40"
                    x2="55"
                    y2="111"
                    stroke="white"
                    strokeWidth="1.5"
                    opacity="0.7"
                  />
                  {/* Rotating Arm */}
                  <g className="metronome-arm">
                    {/* Rod */}
                    <line
                      x1="55"
                      y1="40"
                      x2="55"
                      y2="111"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    {/* Sliding Weight */}
                    <rect
                      x="48"
                      y="45"
                      width="14"
                      height="12"
                      rx="2"
                      fill="white"
                    />
                    {/* Pivot Joint (center of rotation) */}
                    <circle
                      cx="55"
                      cy="90"
                      r="3"
                      fill="white"
                    />
                    {/* Counter Weight */}
                    <circle
                      cx="55"
                      cy="111"
                      r="6"
                      fill="white"
                    />
                  </g>
                </svg>
              </div>
              
              {/* Sub text */}
              <p className="text-base lg:text-lg text-white opacity-85 mb-10 leading-relaxed">
                Organize it your way.
              </p>
              
              {/* Final statement */}
              <p className="text-sm lg:text-base text-white font-medium tracking-wider uppercase">
                EVERYTHING BEGINS WITH YOUR <span className="font-bold">BASE</span>.
              </p>
            </div>
          </div>
          
          {/* SETUP PANEL - Action (Tabs + Form) */}
          <div className="w-full md:w-1/2 bg-gray-50 flex flex-col px-6 py-6 md:px-12 md:py-12 md:min-h-screen md:min-h-0">
            {/* Setup Panel Container - Centered vertically on desktop, top on mobile */}
            <div className="flex flex-col flex-1 md:justify-center max-w-[560px] mx-auto w-full">
              {/* Setup Panel Card */}
              <div className="bg-white rounded-xl shadow-md p-6 md:p-10">
                {/* Tabs */}
                <div className="flex justify-center gap-8 mb-8 border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('create')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors ${
                      activeTab === 'create'
                        ? 'text-gray-900 border-b-2 border-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Create Your Base
                  </button>
                  <button
                    onClick={() => setActiveTab('join')}
                    className={`pb-3 px-1 text-sm font-medium transition-colors ${
                      activeTab === 'join'
                        ? 'text-gray-900 border-b-2 border-gray-900'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Join a Base
                  </button>
                </div>
                
                {/* Tab Content */}
                {activeTab === 'create' ? (
                  // Create Base Tab
                  <form onSubmit={handleInlineCreate} className="space-y-5">
                    {createError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                        {createError}
                      </div>
                    )}
                    
                    <div>
                      <label htmlFor="spaceName" className="block text-sm font-medium text-gray-700 mb-2">
                        Base Name *
                      </label>
                      <input
                        type="text"
                        id="spaceName"
                        value={spaceName}
                        onChange={(e) => {
                          setSpaceName(e.target.value);
                          if (!isSlugCustomized) {
                            const generated = e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]+/g, '-')
                              .replace(/^-+|-+$/g, '');
                            setCustomSlug(generated);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="My Base"
                        required
                      />
                      {/* Slug Preview - Below Base Name */}
                      {getSlugPreview() && (
                        <p className="mt-1.5 text-xs text-gray-500 font-mono">
                          airunote.com/s/{getSlugPreview()}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label htmlFor="customSlug" className="block text-sm font-medium text-gray-700 mb-2">
                        Customize Slug (optional)
                      </label>
                      <input
                        type="text"
                        id="customSlug"
                        value={customSlug}
                        onChange={(e) => {
                          setCustomSlug(e.target.value);
                          setIsSlugCustomized(true);
                        }}
                        onFocus={() => setIsSlugCustomized(true)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="my-base"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                        Description (optional)
                      </label>
                      <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="What is this base for?"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="systemType" className="block text-sm font-medium text-gray-700 mb-2">
                        System Template
                      </label>
                      <select
                        id="systemType"
                        value={systemTypeCode}
                        onChange={(e) => setSystemTypeCode(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Start from Scratch</option>
                        <option value="content-management">Content Management (Posts, Pages)</option>
                        <option value="blank">Blank (No apps)</option>
                      </select>
                    </div>
                    
                    <div>
                      <button
                        type="submit"
                        disabled={creating || !spaceName.trim()}
                        className="w-full h-11 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        {creating ? 'Creating...' : 'Create My Base'}
                      </button>
                      <p className="mt-3 text-xs text-gray-500 text-center">
                        You can create additional bases anytime.
                      </p>
                    </div>
                    
                    {/* Footer - Inside panel */}
                    <div className="mt-10 pt-6 border-t border-gray-100">
                      <p className="text-xs text-gray-400 text-center">
                        © 2020–2025 AOTECH / airunote. All rights reserved.
                      </p>
                    </div>
                  </form>
                ) : (
                  // Join a Base Tab
                  <form onSubmit={handleInlineJoin} className="space-y-5">
                    {joinError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                        {joinError}
                      </div>
                    )}
                    
                    <div>
                      <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-2">
                        Invite Code *
                      </label>
                      <input
                        type="text"
                        id="inviteCode"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        placeholder="ORG-XXXXXX"
                        required
                      />
                    </div>
                    
                    <div>
                      <button
                        type="submit"
                        disabled={joining || !joinCode.trim()}
                        className="w-full h-11 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        {joining ? 'Joining...' : 'Join Base'}
                      </button>
                      <p className="mt-3 text-xs text-gray-500 text-center">
                        Ask your team admin for an invite code.
                      </p>
                    </div>
                    
                    {/* Footer - Inside panel */}
                    <div className="mt-10 pt-6 border-t border-gray-100">
                      <p className="text-xs text-gray-400 text-center">
                        © 2020–2025 AOTECH / airunote. All rights reserved.
                      </p>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      {/* Create Organization Modal - Only show when orgs exist */}
      {orgs.length > 0 && showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Create Organization</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form onSubmit={handleSubmit(onSubmitCreate)} className="p-6">
              {createError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {createError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Name *
                  </label>
                  <input
                    {...register('name')}
                    type="text"
                    id="name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="My Organization"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
                    Slug (optional)
                  </label>
                  <input
                    {...register('slug')}
                    type="text"
                    id="slug"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="my-organization"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Auto-generated from name if not provided
                  </p>
                  {errors.slug && (
                    <p className="mt-1 text-sm text-red-600">{errors.slug.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    {...register('description')}
                    id="description"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="What is this organization about?"
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="systemTypeCode" className="block text-sm font-medium text-gray-700 mb-1">
                    System Type (optional)
                  </label>
                  <select
                    {...register('systemTypeCode')}
                    id="systemTypeCode"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Start from Scratch</option>
                    <option value="content-management">Content Management (Posts, Pages)</option>
                    <option value="blank">Blank (No apps)</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Choose a system type to automatically install recommended apps
                  </p>
                  {errors.systemTypeCode && (
                    <p className="mt-1 text-sm text-red-600">{errors.systemTypeCode.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    reset();
                    setCreateError(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Organization Modal - Only show when orgs exist */}
      {orgs.length > 0 && showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Join Organization</h2>
                <button
                  onClick={() => {
                    setShowJoinModal(false);
                    setJoinCode('');
                    setJoinError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!joinCode.trim()) return;

                setJoining(true);
                setJoinError(null);

                try {
                  await orgsApi.joinWithCode(joinCode.trim().toUpperCase());
                  setShowJoinModal(false);
                  setJoinCode('');
                  loadOrgs();
                } catch (err: any) {
                  setJoinError(err.response?.data?.error?.message || 'Failed to join organization');
                } finally {
                  setJoining(false);
                }
              }}
              className="p-6"
            >
              {joinError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {joinError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label htmlFor="joinCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Join Code
                  </label>
                  <input
                    type="text"
                    id="joinCode"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ORG-XXXXXX"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    disabled={joining}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter the join code provided by the organization administrator
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowJoinModal(false);
                      setJoinCode('');
                      setJoinError(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={joining}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={joining || !joinCode.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {joining ? 'Joining...' : 'Join'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
