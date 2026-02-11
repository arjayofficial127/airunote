'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
// ❌ Do not fetch auth/org/apps here
// ✅ Must consume from session provider
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import Link from 'next/link';
import UserProfileModal from '@/components/user/UserProfileModal';
import OrgAccessChecker from '@/components/org/OrgAccessChecker';
import type { Org } from '@/lib/api/orgs';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { UnifiedSidebar } from '@/components/layout/UnifiedSidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { EditorSidebarProvider } from '@/contexts/EditorSidebarContext';
import { SessionAppStoreProvider } from '@/contexts/SessionAppStoreContext';
import { SessionBoundary } from '@/components/system/SessionBoundary';
import { OnlineIndicator } from '@/components/system/OnlineIndicator';
import { useMetadataIndex } from '@/providers/MetadataIndexProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  
  // ✅ Consume from session providers
  const authSession = useAuthSession();
  const orgSession = useOrgSession();
  const metadataIndex = useMetadataIndex();
  
  const user = authSession.user;
  const authLoading = authSession.status === 'loading';
  const refetchAuth = authSession.refetch;
  const logoutAuth = authSession.logout;
  
  // ✅ activeOrgId is SINGLE SOURCE OF TRUTH - do NOT use params.orgId
  const orgId = orgSession.activeOrgId;
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  // ✅ Get org from session provider
  const org = orgSession.activeOrg;
  // Sidebar: closed by default on mobile, open by default on desktop (permanent on desktop)
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // lg breakpoint
    }
    return false;
  });
  const [entityName, setEntityName] = useState<string | null>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  
  // Detect if we're in editor mode (section/template/page editor)
  const isEditorMode = pathname?.includes('/edit') ?? false;
  
  // Detect if we're viewing an app (but not the app management page)
  const isViewingApp = (pathname?.includes('/apps/') && !pathname?.includes('/apps/manage') && !pathname?.endsWith('/apps')) ?? false;
  
  // Extract app code from pathname
  const appCode = isViewingApp && pathname ? (() => {
    const match = pathname.match(/\/apps\/([^\/]+)/);
    return match ? match[1] : null;
  })() : null;
  
  // App sidebar state (for apps that don't have their own sidebar system)
  const [appSidebarOpen, setAppSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined' && isViewingApp) {
      return window.innerWidth >= 1024; // Open on desktop by default
    }
    return false;
  });
  
  // Reset app sidebar when switching apps
  useEffect(() => {
    if (isViewingApp) {
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        setAppSidebarOpen(true);
      } else {
        setAppSidebarOpen(false);
      }
    }
  }, [isViewingApp, appCode]);
  
  // Editor sidebar state (for editor mode only)
  // On mobile, keep closed by default. On desktop, open by default.
  const [editorSidebarOpen, setEditorSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024; // Only open on desktop
    }
    return false; // SSR default to closed
  });
  
  // Sidebar starts closed (overlay style on all screen sizes)

  // Reset editor sidebar when entering editor mode (only open on desktop)
  useEffect(() => {
    if (isEditorMode) {
      if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
        setEditorSidebarOpen(true);
      } else {
        setEditorSidebarOpen(false);
      }
    }
  }, [isEditorMode]);
  
  // Check if we're in org context
  const isInOrgContext = pathname?.startsWith('/orgs/') && orgId;
  
  // ✅ Get permissions from org session
  const roles = orgSession.roles;
  const isAdmin = roles.some((r: string) => r.toLowerCase() === 'admin');
  const isMember = roles.length > 0;
  
  // SessionBoundary handles loading/error states - no need for isOrgDataLoading

  // Handle redirect to login if not authenticated (after auth check completes)
  useEffect(() => {
    // Check if this is a public page route - if so, don't redirect
    const isPageRoute = pathname?.match(/^\/orgs\/[^/]+\/pages\/[^/]+$/);
    
    // Wait for auth check to complete
    if (authSession.status === 'loading') {
      return;
    }

    // If not authenticated and not a public page route, redirect to login
    if (authSession.status === 'ready' && !user && !isPageRoute) {
      console.log('[DashboardLayout] Not authenticated, redirecting to login');
      setIsRedirecting(true);
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  }, [authSession.status, user, pathname]);

  const handleLogout = async () => {
    await logoutAuth();
    router.push('/login');
  };

  const handleExitOrg = () => {
    router.push('/orgs');
  };


  // Close user dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  // Determine MODE (isInOrgContext already defined above)
  const mode = isInOrgContext ? 'ORG CONTEXT' : 'BASE SYSTEM';

  // Determine ROLE (formatted for display)
  const getRole = (): string => {
    if (roles.some((r: string) => r.toLowerCase() === 'admin')) return 'Admin';
    if (roles.some((r: string) => r.toLowerCase() === 'member')) return 'Member';
    return 'Member'; // Default fallback
  };

  const role = getRole();
  
  // Format context name for display
  const getContextDisplay = (): string => {
    if (isInOrgContext && org) {
      return `${org.name} (${role})`;
    }
    return `Base System (${role})`;
  };

  const contextDisplay = getContextDisplay();

  // Prepare provider states for SessionBoundary
  // Only include org/metadata if we're in org context
  const providerStates = isInOrgContext
    ? [
        { status: authSession.status, error: authSession.error },
        { status: orgSession.status, error: orgSession.error },
        { status: metadataIndex.status, error: metadataIndex.error },
      ]
    : [
        { status: authSession.status, error: authSession.error },
      ];

  // Show loading/error boundary for session providers
  // This gates the entire dashboard until all required providers are ready
  return (
    <SessionBoundary
      states={providerStates}
      loadingMessage={isInOrgContext ? 'Preparing workspace…' : 'Loading…'}
      onRetry={() => {
        // Retry all providers
        if (authSession.status === 'error') authSession.refetch();
        if (orgSession.status === 'error') orgSession.refetch();
        if (metadataIndex.status === 'error') metadataIndex.refreshAll();
      }}
    >
      {/* Inner content - only renders when all providers are ready */}
      {isRedirecting ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-600">Redirecting...</div>
        </div>
      ) : (
        <SessionAppStoreProvider>
      <ErrorBoundary>
        <OrgAccessChecker>
        <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
          <nav className="bg-white border-b border-gray-200 flex-shrink-0 fixed top-0 left-0 right-0 z-30">
            <div className="w-full px-3 sm:px-4 lg:px-8">
              <div className="flex items-center justify-between h-14 sm:h-16">
                {/* Left: AtomicFuel + Hamburger */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* AtomicFuel */}
                  <Link href="/dashboard" className="text-lg sm:text-xl font-bold text-gray-900 hover:text-gray-700 transition">
                    AtomicFuel
                  </Link>
                  {/* Online Indicator */}
                  <OnlineIndicator />
                  
                  {/* Hamburger menu - show for all views (including apps) */}
                  <button
                    onClick={() => {
                      if (isViewingApp) {
                        // Check if app has its own sidebar state (like PostApp)
                        if (typeof window !== 'undefined' && (window as any).__postAppSidebarState) {
                          (window as any).__postAppSidebarState.toggle();
                        } else {
                          // Use unified app sidebar state
                          setAppSidebarOpen(!appSidebarOpen);
                        }
                      } else if (isEditorMode) {
                        setEditorSidebarOpen(!editorSidebarOpen);
                      } else {
                        setSidebarOpen(!sidebarOpen);
                      }
                    }}
                    className={`p-2 rounded-md text-gray-600 hover:text-gray-900 transition-all duration-200 ${
                      (isViewingApp && (
                        (typeof window !== 'undefined' && (window as any).__postAppSidebarState?.isOpen) ||
                        appSidebarOpen
                      )) ||
                      (isEditorMode ? editorSidebarOpen : sidebarOpen)
                        ? 'bg-gray-100' 
                        : 'hover:bg-gray-50'
                    }`}
                    aria-label="Toggle sidebar"
                  >
                    {/* Static hamburger icon - always shows 3 lines */}
                    <svg 
                      className="w-5 h-5"
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="4" y1="6" x2="20" y2="6" />
                      <line x1="4" y1="12" x2="20" y2="12" />
                      <line x1="4" y1="18" x2="20" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Right cluster: Settings + User dropdown (same on mobile and desktop) */}
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* Settings button - only show in org context */}
                  {isInOrgContext && orgId && (
                    <Link
                      href={`/orgs/${orgId}/settings`}
                      className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
                      aria-label="Settings"
                      title="Settings"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </Link>
                  )}
                  
                  {/* USER dropdown - same on mobile and desktop */}
                  {user && (
                    <div className="relative" ref={userDropdownRef}>
                      <button
                        onClick={() => setShowUserDropdown(!showUserDropdown)}
                        className="flex items-center gap-1.5 text-sm font-medium text-gray-900 px-2 sm:px-3 py-1.5 rounded hover:bg-gray-100 transition cursor-pointer"
                      >
                        <span className="max-w-[120px] truncate">{user.name || user.email || 'User'}</span>
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {showUserDropdown && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                          <button
                            onClick={() => {
                              setIsProfileModalOpen(true);
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Edit Profile
                          </button>
                          <button
                            onClick={() => {
                              handleLogout();
                              setShowUserDropdown(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Logout
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {!user && !authLoading && (
                    <Link
                      href="/login"
                      className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded hover:bg-gray-100 transition"
                    >
                      Login
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </nav>
          <ErrorBoundary>
            <div className="flex-1 overflow-hidden min-h-0 flex relative pt-14 sm:pt-16">
              {/* Overlay backdrop - only on mobile when sidebar is open */}
              {sidebarOpen && !isEditorMode && !isViewingApp && (
                <div
                  className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
                  onClick={() => setSidebarOpen(false)}
                  style={{ top: '3.5rem' }} // Account for top nav bar
                />
              )}
              
              {appSidebarOpen && isViewingApp && (
                <div
                  className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
                  onClick={() => setAppSidebarOpen(false)}
                  style={{ top: '3.5rem' }} // Account for top nav bar
                />
              )}
              
              {/* Unified Sidebar - always visible, not blocked by loading */}
              {!isEditorMode && !isViewingApp && (
                <UnifiedSidebar 
                  context={isInOrgContext ? 'org' : 'dashboard'} 
                  orgId={orgId} 
                  entityName={entityName}
                  isOpen={sidebarOpen}
                  onClose={() => setSidebarOpen(false)}
                  onToggle={() => setSidebarOpen(!sidebarOpen)}
                  onNavigate={() => {
                    // Auto-close on mobile when navigating
                    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                      setSidebarOpen(false);
                    }
                  }}
                  // ✅ Pass data from session providers to avoid duplicate API calls
                  preloadedIsAdmin={isInOrgContext ? isAdmin : undefined}
                  preloadedIsMember={isInOrgContext ? isMember : undefined}
                  preloadedRoles={isInOrgContext ? roles : undefined}
                  preloadedOrg={isInOrgContext ? org : undefined}
                />
              )}
              
              {/* App Sidebar - shown when viewing apps (for apps without their own sidebar) */}
              {isViewingApp && (
                <AppSidebar
                  isOpen={appSidebarOpen}
                  onClose={() => setAppSidebarOpen(false)}
                  appCode={appCode || undefined}
                />
              )}
              
              {/* Main content area - SessionBoundary handles loading/error states */}
              <main 
                className={`flex-1 overflow-auto min-h-0 transition-all duration-300 ${
                  !isEditorMode && !isViewingApp && sidebarOpen ? 'lg:ml-64' : ''
                }`}
              >
                    {children}
              </main>
            </div>
          </ErrorBoundary>

          <UserProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            user={user}
            onUpdate={async () => {
              // Refetch auth data after profile update
              await refetchAuth();
            }}
          />
        </div>
        </OrgAccessChecker>
      </ErrorBoundary>
    </SessionAppStoreProvider>
      )}
    </SessionBoundary>
  );
}

