'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useOrgPermissions } from '@/hooks/useOrgPermissions';
import { useState, useEffect, useCallback, useRef } from 'react';
import { type Org } from '@/lib/api/orgs';
import { FolderTree } from '@/components/airunote/components/FolderTree';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { useOrgSession } from '@/providers/OrgSessionProvider';

interface NavItem {
  href: string;
  label: string;
  subtitle?: string | null;
  children?: NavItem[];
}

interface UnifiedSidebarProps {
  context: 'dashboard' | 'admin' | 'org';
  orgId?: string | null;
  entityName?: string | null; // Name of entity being edited (section, template, etc.)
  isOpen?: boolean;
  onClose?: () => void;
  onToggle?: () => void; // Toggle sidebar visibility
  onNavigate?: () => void; // Called when navigation occurs (for auto-closing on mobile)
  // Optional: Pre-loaded data from /auth/me/full to avoid duplicate API calls
  preloadedIsSuperAdmin?: boolean; // Super admin status from authFull
  preloadedIsAdmin?: boolean; // Admin status from authFull
  preloadedIsMember?: boolean; // Member status from authFull
  preloadedRoles?: string[]; // Roles from authFull
  preloadedOrg?: Org | null; // Org data from authFull
}

const SHOW_KNOWLEDGE = false;

export function UnifiedSidebar({ 
  context, 
  orgId, 
  entityName, 
  isOpen = true, 
  onClose, 
  onToggle, 
  onNavigate,
  preloadedIsSuperAdmin,
  preloadedIsAdmin,
  preloadedIsMember,
  preloadedRoles,
  preloadedOrg,
}: UnifiedSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Use preloaded data if available, otherwise fallback to hooks
  const { isSuperAdmin: hookSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const orgIdForHook: string | null = preloadedOrg || preloadedIsAdmin !== undefined ? null : (orgId ? orgId : null);
  const { isAdmin: hookIsAdmin, isMember: hookIsMember, loading: permissionsLoading, org: permissionsOrg, roles: hookRoles } = useOrgPermissions(orgIdForHook);
  
  const isSuperAdmin = preloadedIsSuperAdmin !== undefined ? preloadedIsSuperAdmin : hookSuperAdmin;
  const isAdmin = preloadedIsAdmin !== undefined ? preloadedIsAdmin : hookIsAdmin;
  const isMember = preloadedIsMember !== undefined ? preloadedIsMember : hookIsMember;
  const roles = preloadedRoles ?? hookRoles ?? [];
  const org = preloadedOrg ?? permissionsOrg;

  const isOrgRoute = context === 'org' || Boolean(orgId) || Boolean(pathname?.startsWith('/orgs/'));
  const isOrgReady = !isOrgRoute || Boolean(org?.name);

  const showTestMenuBackground = !isOrgReady || (context === 'dashboard' && isSuperAdmin === false);

  // Get auth session for userId (needed for folder tree)
  const authSession = useAuthSession();
  const orgSession = useOrgSession();
  const user = authSession.user;
  const userId = authSession.user?.id ?? null;
  const [isAllExpanded, setIsAllExpanded] = useState(true);
  const [isKnowledgeExpanded, setIsKnowledgeExpanded] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Get data from store (metadata loaded by AirunoteDataProvider)
  const { buildTree, foldersById, getFolderItemCount, isLoading: isStoreLoading } = useAirunoteStore();

  // Extract current folder ID from pathname if on folder/document page
  const getCurrentFolderId = (): string | undefined => {
    if (!pathname) return undefined;
    const folderMatch = pathname.match(/\/airunote\/folder\/([^/]+)/);
    if (folderMatch) return folderMatch[1];
    // For document pages, we don't have folderId in path, so return undefined
    return undefined;
  };

  const currentFolderId = getCurrentFolderId();

  // Build folder tree from store when in folders mode
  // Find user root folder to build tree from
  const allFolders = Array.from(foldersById.values());
  const userRoot = allFolders.find(
    (f) => f.humanId === '__user_root__' && f.ownerUserId === userId
  );
  const rootFolderId = userRoot?.id || null;
  
  // Build tree from store for unified content navigation
  const folderTree = rootFolderId && !isStoreLoading
    ? buildTree(rootFolderId)
    : null;

  const knowledgeFolders = allFolders
    .filter((folder) => folder.type === 'wiki' && !folder.humanId.startsWith('__'))
    .sort((left, right) => left.humanId.localeCompare(right.humanId));

  const allContentCount = rootFolderId ? getFolderItemCount(rootFolderId, true) : 0;

  const getUserLabel = () => {
    if (user?.name?.trim()) {
      return user.name.trim();
    }

    return user?.email || 'User';
  };

  const getShortUserLabel = () => {
    const label = getUserLabel();
    const [firstPart] = label.split(/\s+/).filter(Boolean);

    if (firstPart) {
      return firstPart;
    }

    return label.split('@')[0] || 'User';
  };

  const getUserInitials = () => {
    const label = getUserLabel();
    const parts = label.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
    }

    return label.slice(0, 2).toUpperCase();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // Water overlay state machine (two layers)
  // - mask: responsible for retracting/hiding, can retract even while content is still rising
  // - content: responsible for rising/drifting visuals
  type WaterMaskPhase = 'off' | 'open' | 'retracting';
  type WaterContentPhase = 'rising' | 'steady';

  const [waterMaskPhase, setWaterMaskPhase] = useState<WaterMaskPhase>('off');
  const [waterContentPhase, setWaterContentPhase] = useState<WaterContentPhase>('steady');

  const waterMaskPhaseRef = useRef<WaterMaskPhase>('off');
  const waterMaskTimerRef = useRef<number | null>(null);
  const waterContentTimerRef = useRef<number | null>(null);

  useEffect(() => {
    waterMaskPhaseRef.current = waterMaskPhase;
  }, [waterMaskPhase]);

  useEffect(() => {
    if (waterMaskTimerRef.current !== null) {
      window.clearTimeout(waterMaskTimerRef.current);
      waterMaskTimerRef.current = null;
    }
    if (waterContentTimerRef.current !== null) {
      window.clearTimeout(waterContentTimerRef.current);
      waterContentTimerRef.current = null;
    }

    const startRetract = () => {
      if (waterMaskPhaseRef.current === 'off') return;
      setWaterMaskPhase('retracting');
      waterMaskTimerRef.current = window.setTimeout(() => {
        setWaterMaskPhase('off');
        waterMaskTimerRef.current = null;
      }, 5000);
    };

    // If background is no longer desired, retract first (if currently visible)
    if (!showTestMenuBackground) {
      startRetract();
      return;
    }

    // Background is desired
    if (isOpen) {
      // Ensure mask is visible immediately; content can still be in the middle of rising
      setWaterMaskPhase('open');
      setWaterContentPhase('rising');
      waterContentTimerRef.current = window.setTimeout(() => {
        setWaterContentPhase('steady');
        waterContentTimerRef.current = null;
      }, 1200);
      return;
    }

    // Background is desired but sidebar is closing/closed
    startRetract();
    return;
  }, [showTestMenuBackground, isOpen]);

  const shouldRenderWater = waterMaskPhase !== 'off';
  
  // Determine loading state: if we have preloaded data, we're not loading
  // Otherwise, use the hook's loading state
  const isPermissionsLoading = (preloadedOrg !== undefined || preloadedIsAdmin !== undefined) 
    ? false 
    : permissionsLoading;
  const isSuperAdminLoadingState = preloadedIsSuperAdmin !== undefined 
    ? false 
    : superAdminLoading;
  

  // Determine role
  const getRole = (): 'Super Admin' | 'Admin' | 'Member' => {
    if (isSuperAdmin) return 'Super Admin';
    if (isAdmin) return 'Admin';
    return 'Member';
  };

  const role = !isSuperAdminLoadingState && !isPermissionsLoading ? getRole() : null;

  // Build nav items based on context
  const getNavItems = (): NavItem[] => {
    if (context === 'dashboard') {
      const items: NavItem[] = [
        // { href: '/dashboard', label: 'Dashboard', subtitle: null },
      ];
      
      if (isSuperAdmin) {
        items.push(
          { href: '/orgs', label: 'Organizations', subtitle: 'View all orgs' },
          { href: '/admin/settings', label: 'Settings', subtitle: 'Encrypt/Decrypt tools' }
        );
      }
      
      return items;
    }

    if (context === 'admin') {
      return [
        { href: '/dashboard', label: 'Dashboard', subtitle: null },
        { href: '/admin/settings', label: 'Settings', subtitle: 'Encrypt/Decrypt tools' },
      ];
    }

    return [];
  };

  const navItems = getNavItems();

  const isActive = (href: string): boolean => {
    if (!pathname) return false;
    if (href === '#') return false;
    
    // Direct path match
    if (pathname === href || pathname.startsWith(href + '/')) {
      return true;
    }
    
    return false;
  };

  const adminItems: NavItem[] = context === 'org' && orgId
    ? [
        { href: `/orgs/${orgId}/dashboard`, label: 'Dashboard' },
        // { href: `/orgs/${orgId}/posts`, label: 'Posts' },
        // { href: `/orgs/${orgId}/collections`, label: 'Collections' },
        { href: `/orgs/${orgId}/members`, label: 'Members' },
        { href: `/orgs/${orgId}/settings`, label: 'Settings' },
      ]
    : [];

  const renderIcon = (name: 'dashboard' | 'posts' | 'collections' | 'members' | 'settings' | 'home' | 'all' | 'knowledge') => {
    switch (name) {
      case 'dashboard':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 13h6V4H4v9zm10 7h6V11h-6v9zM4 20h6v-3H4v3zm10-13h6V4h-6v3z" />
          </svg>
        );
      case 'posts':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 10h8M8 14h5M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
          </svg>
        );
      case 'collections':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7h18M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" />
          </svg>
        );
      case 'members':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20a4 4 0 00-8 0M12 12a4 4 0 100-8 4 4 0 000 8zm7 8a5 5 0 00-3-4.58M5 20a5 5 0 013-4.58" />
          </svg>
        );
      case 'settings':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'home':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10.5L12 3l9 7.5M5 9.5V20h14V9.5" />
          </svg>
        );
      case 'all':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
          </svg>
        );
      case 'knowledge':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5.5A2.5 2.5 0 016.5 3H20v18H6.5A2.5 2.5 0 014 18.5v-13z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h8M8 11h8M8 15h5" />
          </svg>
        );
    }
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await authSession.logout();
    router.push('/login');
  };

  const handleSwitchWorkspaceClick = () => {
    // Reserved for future workspace switcher flow.
  };

  const isOrgSidebar = context === 'org' && Boolean(orgId);
  const hasMultipleWorkspaces = orgSession.orgs.length > 1;

  return (
    <>
      {/* Sidebar - respects isOpen state on all screen sizes */}
      {/* IMPORTANT: Always fixed positioning - content adjusts via margin-left, top bar NEVER hidden */}
      <aside
        className={`fixed left-0 w-64 overflow-x-hidden ${showTestMenuBackground ? 'bg-transparent' : 'bg-white'} border-r border-gray-200 flex flex-col z-40 transform transition-all duration-300 ease-in-out top-14 sm:top-14 ${
          isOpen 
            ? 'translate-x-0 opacity-100 pointer-events-auto' 
            : '-translate-x-full opacity-0 pointer-events-none'
        }`}
        style={{ 
          height: 'calc(100vh - 3.5rem)',
        }}
      >
        {/* Water overlay animation */}
        {shouldRenderWater && (
          <div className="waterMask" data-mask={waterMaskPhase} aria-hidden="true">
            <div className="waterContent" data-content={waterContentPhase}>
              <div className="waterBody">
                {/* 300x300 wave widget (kept "as is"; may clip within 256px sidebar) */}
                <div className="menuWaveWidget" aria-hidden="true">
                  <div className="menuWaveContainer">
                    <div className="menuWaveSun" />
                    <div className="menuWave01" />
                    <div className="menuWave02" />
                    <div className="menuWave03" />
                  </div>
                </div>

                {/* Fills remaining space below the widget */}
                <div className="menuWaveFill" aria-hidden="true" />
              </div>
              <div className="waterFoam" />
            </div>
          </div>
        )}

        <div className="relative z-10 flex flex-col h-full">
        

          {isOrgReady && (
          <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-2">
          {isPermissionsLoading && isOrgSidebar ? (
            <div className="space-y-4 px-4 py-4">
              <div className="space-y-2 rounded-2xl border border-slate-200/80 bg-white/90 p-4">
                <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-12 animate-pulse rounded bg-slate-200" />
              </div>
              <div className="h-10 animate-pulse rounded-xl bg-slate-200" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-10 animate-pulse rounded-xl bg-slate-200" />
                ))}
              </div>
            </div>
          ) : isOrgSidebar && orgId ? (
            <div className="flex min-h-full flex-col px-4 py-4">
              <div>
                <div className="px-3 py-2">
                  <div className="truncate text-[15px] font-medium text-slate-800">{org?.name || 'Workspace'}</div>
                  <div className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-slate-500/80">{role || 'Member'}</div>
                </div>
              </div>

              <div className="mt-2 h-px bg-slate-200/70" />

              <div>
                <div className="space-y-1 pt-2">
                  {adminItems.map((item) => {
                    const iconName = item.label.toLowerCase() as 'dashboard' | 'posts' | 'collections' | 'members' | 'settings';
                    const itemIsActive = isActive(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={onNavigate}
                        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                          itemIsActive
                            ? 'bg-slate-100 text-slate-900'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">{renderIcon(iconName)}</span>
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}

                  {hasMultipleWorkspaces && (
                    <button
                      type="button"
                      onClick={handleSwitchWorkspaceClick}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                    >
                      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7h11m0 0L12 4m3 3l-3 3M20 17H9m0 0l3-3m-3 3l3 3" />
                        </svg>
                      </span>
                      <span className="truncate">Switch Workspace</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="my-4 h-px bg-slate-200/70" />

              <div className="min-h-0 flex-1">
                <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Content</div>

                <div className="space-y-1">
                  <Link
                    href={`/orgs/${orgId}/airunote`}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      pathname === `/orgs/${orgId}/airunote`
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">{renderIcon('home')}</span>
                    <span className="truncate font-medium">Home</span>
                  </Link>

                  <div className="rounded-2xl bg-white/80">
                    <button
                      onClick={() => setIsAllExpanded((current) => !current)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                        pathname?.includes(`/orgs/${orgId}/airunote`)
                          ? 'text-slate-900'
                          : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                      }`}
                    >
                      <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">{renderIcon('all')}</span>
                      <span className="flex-1 truncate text-left font-medium">Folders</span>
                      {allContentCount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                          {allContentCount}
                        </span>
                      )}
                      <svg
                        className={`h-4 w-4 text-slate-400 transition-transform duration-150 ${isAllExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div
                      className={`grid overflow-hidden transition-all duration-150 ease-out ${
                        isAllExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="pb-2 pl-0 pr-2 pt-1">
                          {folderTree ? (
                            <FolderTree tree={folderTree} currentFolderId={currentFolderId} orgId={orgId} showHome={false} />
                          ) : (
                            <div className="px-3 py-3 text-sm text-slate-500">Loading content…</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {SHOW_KNOWLEDGE && (
                    <div className="rounded-2xl bg-white/80">
                      <button
                        onClick={() => setIsKnowledgeExpanded((current) => !current)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-900 transition hover:bg-slate-100/80"
                      >
                        <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">{renderIcon('knowledge')}</span>
                        <span className="flex-1 truncate text-left font-medium">Knowledge</span>
                        <svg
                          className={`h-4 w-4 text-slate-400 transition-transform duration-150 ${isKnowledgeExpanded ? 'rotate-90' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <div
                        className={`grid overflow-hidden transition-all duration-150 ease-out ${
                          isKnowledgeExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="space-y-1 px-2 pb-2 pt-1">
                            {knowledgeFolders.length > 0 ? (
                              knowledgeFolders.map((folder) => {
                                const knowledgeHref = `/orgs/${orgId}/airunote/folder/${folder.id}`;
                                const itemCount = getFolderItemCount(folder.id, true);
                                const activeKnowledge = isActive(knowledgeHref);

                                return (
                                  <Link
                                    key={folder.id}
                                    href={knowledgeHref}
                                    onClick={onNavigate}
                                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                                      activeKnowledge
                                        ? 'bg-slate-100 text-slate-900'
                                        : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                                    }`}
                                  >
                                    <span className="truncate">{folder.humanId}</span>
                                    <span className="ml-auto inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                                      {itemCount}
                                    </span>
                                  </Link>
                                );
                              })
                            ) : (
                              <div className="px-3 py-2 text-sm text-slate-500">No knowledge folders yet.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-2 py-2">
              {navItems.map((item) => {
                const itemIsActive = isActive(item.href);

                return (
                  <Link
                    key={item.href || item.label}
                    href={item.href}
                    onClick={onNavigate}
                    className={`relative mb-1 flex items-start justify-between gap-3 rounded-xl px-4 py-2.5 transition ${
                      itemIsActive
                        ? 'bg-cyan-50 text-cyan-700 font-medium'
                        : 'text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                      <span className="text-sm leading-5 whitespace-normal break-words">{item.label}</span>
                      {item.subtitle && (
                        <span className="mt-0.5 text-xs leading-4 text-gray-500 whitespace-normal break-words">{item.subtitle}</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
          </nav>
          )}
        
        {/* Footer in sidebar - fixed at bottom */}
          {isOrgReady && (
            <footer className="px-4 pb-4 pt-2 flex-shrink-0">
              {isOrgSidebar && user ? (
                <div className="space-y-3">
                  <div className="h-px bg-slate-200/70" />
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setIsUserMenuOpen((current) => !current)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-3 text-left shadow-sm transition hover:border-slate-300"
                    >
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                        {getUserInitials()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">{getShortUserLabel()}</span>
                        <span className="block truncate text-xs text-slate-500">{user.email}</span>
                      </span>
                      <svg className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-150 ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isUserMenuOpen && (
                      <div className="absolute bottom-full left-0 right-0 z-10 mb-2 rounded-2xl border border-slate-200 bg-white/98 p-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="px-1 text-center text-[11px] tracking-[0.08em] text-slate-400">© AOTECH</div>
                </div>
              ) : (
                <div className="text-center text-[11px] tracking-[0.08em] text-slate-400">© AOTECH</div>
              )}
            </footer>
          )}
        </div>
      </aside>
      <style>{`
        .waterMask {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          will-change: transform;
          transform: translateY(0);
        }

        .waterMask[data-mask="retracting"] {
          animation: maskRetract 5000ms ease-in forwards;
        }

        .waterContent {
          position: absolute;
          inset: 0;
        }

        .waterBody {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 100%;
          // background: green;
          will-change: transform;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: stretch;
        }

        .waterFoam {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 20%;
          background: linear-gradient(to top,
            rgba(255, 255, 255, 0.8) 0%,
            rgba(255, 255, 255, 0.4) 50%,
            transparent 100%
          );
          will-change: transform, opacity;
        }

        .waterContent[data-content="rising"] .waterBody {
          animation: waterRise 1200ms ease-out forwards;
          transform: translateY(100%);
        }

        .waterContent[data-content="rising"] .waterFoam {
          animation: foamRise 1200ms ease-out forwards;
          transform: translateY(100%);
          opacity: 0;
        }

        .waterContent[data-content="steady"] .waterBody {
          transform: translateY(0);
          animation: waterDrift 8s ease-in-out infinite;
        }

        .waterContent[data-content="steady"] .waterFoam {
          transform: translateY(0);
          opacity: 1;
          animation: foamBob 4s ease-in-out infinite;
        }

        .menuWaveWidget {
          width: 300px;
          height: 300px;
          position: relative;
          margin: 0 auto;
          flex: 0 0 auto;
          pointer-events: none;
          z-index: 1;
        }

        .menuWaveFill {
          flex: 1 1 auto;
          width: 100%;
          background: #3787a2;
          margin-top: -13px;
          padding-bottom: 13px;
          z-index: 111;
        }

        .menuWaveContainer {
          width: 300px;
          height: 300px;
          position: relative;
          overflow: hidden;
        }

        // .menuWaveSun {
        //   width: 70px;
        //   height: 70px;
        //   position: absolute;
        //   top: 20px;
        //   right: 40px;
        //   background-color: #f9cb5d;
        //   border-radius: 50%;
        // }

        .menuWave01 {
          position: absolute;
          width: 300%;
          height: 300%;
          left: -100%;
          top: 50%;
          background-color: rgba(0, 190, 255, 0.4);
          border-radius: 45%;
          animation: menuWaveRotate 10s linear infinite;
        }

        .menuWave02 {
          position: absolute;
          width: 300%;
          height: 300%;
          left: -100%;
          top: 57%;
          background-color: rgba(0, 70, 110, 0.4);
          border-radius: 43%;
          animation: menuWaveRotate 7s linear infinite;
        }

        .menuWave03 {
          position: absolute;
          width: 300%;
          height: 300%;
          left: -100%;
          top: 60%;
          background-color: rgba(0, 90, 110, 0.4);
          border-radius: 40%;
          animation: menuWaveRotate 5s linear infinite;
        }

        /* Droplet / grain shimmer along the wave edges (unique per layer for visibility) */
        .menuWave01::before,
        .menuWave02::before,
        .menuWave03::before {
          content: '';
          position: absolute;
          inset: -2%;
          border-radius: inherit;
          pointer-events: none;
          mix-blend-mode: screen;
          will-change: transform, opacity, background-position;
        }

        .menuWave01::before {
          opacity: 0.9;
          background-image:
            radial-gradient(circle, rgba(255, 255, 255, 0.9) 0 0.9px, transparent 1.15px),
            radial-gradient(circle, rgba(200, 250, 255, 0.55) 0 1.3px, transparent 1.7px),
            radial-gradient(circle, rgba(255, 255, 255, 0.35) 0 0.6px, transparent 0.95px);
          background-size: 14px 14px, 26px 26px, 44px 44px;
          background-position: 0 0, 11px 17px, 7px 3px;
          filter: blur(0.15px) drop-shadow(0 0 10px rgba(220, 255, 255, 0.25));
          -webkit-mask-image: radial-gradient(circle at 50% 50%, transparent 55.5%, rgba(0,0,0,1) 58.5%, rgba(0,0,0,1) 63.5%, transparent 66.5%);
          mask-image: radial-gradient(circle at 50% 50%, transparent 55.5%, rgba(0,0,0,1) 58.5%, rgba(0,0,0,1) 63.5%, transparent 66.5%);
          animation: menuGrainDriftA 2.35s linear infinite, menuGrainFlickerA 680ms steps(3, end) infinite;
        }

        .menuWave02::before {
          opacity: 0.8;
          background-image:
            radial-gradient(circle, rgba(210, 245, 255, 0.8) 0 0.7px, transparent 1.1px),
            radial-gradient(circle, rgba(170, 235, 255, 0.45) 0 1.1px, transparent 1.55px),
            radial-gradient(circle, rgba(255, 255, 255, 0.28) 0 0.55px, transparent 0.9px);
          background-size: 12px 12px, 23px 23px, 39px 39px;
          background-position: 6px 2px, 14px 11px, 3px 19px;
          filter: blur(0.2px) drop-shadow(0 0 9px rgba(160, 230, 255, 0.22));
          -webkit-mask-image: radial-gradient(circle at 50% 50%, transparent 56.5%, rgba(0,0,0,1) 60%, rgba(0,0,0,1) 63.5%, transparent 66%);
          mask-image: radial-gradient(circle at 50% 50%, transparent 56.5%, rgba(0,0,0,1) 60%, rgba(0,0,0,1) 63.5%, transparent 66%);
          animation: menuGrainDriftB 1.95s linear infinite reverse, menuGrainFlickerB 540ms steps(2, end) infinite;
        }

        .menuWave03::before {
          opacity: 0.72;
          background-image:
            radial-gradient(circle, rgba(255, 255, 255, 0.65) 0 0.65px, transparent 1.0px),
            radial-gradient(circle, rgba(140, 225, 255, 0.35) 0 1.0px, transparent 1.45px),
            radial-gradient(circle, rgba(255, 255, 255, 0.22) 0 0.5px, transparent 0.85px);
          background-size: 10px 10px, 19px 19px, 31px 31px;
          background-position: 2px 8px, 9px 3px, 17px 21px;
          filter: blur(0.25px) drop-shadow(0 0 8px rgba(120, 210, 245, 0.2));
          -webkit-mask-image: radial-gradient(circle at 50% 50%, transparent 57.5%, rgba(0,0,0,1) 60.5%, rgba(0,0,0,1) 63.5%, transparent 66%);
          mask-image: radial-gradient(circle at 50% 50%, transparent 57.5%, rgba(0,0,0,1) 60.5%, rgba(0,0,0,1) 63.5%, transparent 66%);
          animation: menuGrainDriftC 1.65s linear infinite, menuGrainFlickerC 480ms steps(2, end) infinite;
        }

        @keyframes waterRise {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        @keyframes menuWaveRotate {
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes menuGrainDriftA {
          0% {
            transform: rotate(0deg) translate3d(0, 0, 0);
            background-position: 0 0, 11px 17px, 7px 3px;
          }
          50% {
            transform: rotate(10deg) translate3d(1px, -1px, 0);
            background-position: 22px 8px, 38px 25px, 18px 14px;
          }
          100% {
            transform: rotate(20deg) translate3d(2px, 0px, 0);
            background-position: 44px 16px, 65px 40px, 29px 25px;
          }
        }

        @keyframes menuGrainDriftB {
          0% {
            transform: rotate(0deg) translate3d(0, 0, 0);
            background-position: 6px 2px, 14px 11px, 3px 19px;
          }
          50% {
            transform: rotate(7deg) translate3d(-1px, 1px, 0);
            background-position: 26px 14px, 41px 33px, 18px 7px;
          }
          100% {
            transform: rotate(14deg) translate3d(-2px, 0px, 0);
            background-position: 48px 28px, 69px 55px, 33px -5px;
          }
        }

        @keyframes menuGrainDriftC {
          0% {
            transform: rotate(0deg) translate3d(0, 0, 0);
            background-position: 2px 8px, 9px 3px, 17px 21px;
          }
          50% {
            transform: rotate(12deg) translate3d(1px, 0px, 0);
            background-position: 18px 26px, 28px 14px, 33px 2px;
          }
          100% {
            transform: rotate(24deg) translate3d(2px, 1px, 0);
            background-position: 36px 44px, 52px 28px, 49px -14px;
          }
        }

        @keyframes menuGrainFlickerA {
          0%, 100% {
            opacity: 0.65;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes menuGrainFlickerB {
          0%, 100% {
            opacity: 0.55;
          }
          50% {
            opacity: 0.95;
          }
        }

        @keyframes menuGrainFlickerC {
          0%, 100% {
            opacity: 0.48;
          }
          50% {
            opacity: 0.9;
          }
        }

        @keyframes foamRise {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes maskRetract {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(100%);
          }
        }

        @keyframes waterDrift {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          25% {
            transform: translateY(-2px) translateX(1px);
          }
          50% {
            transform: translateY(0) translateX(0);
          }
          75% {
            transform: translateY(2px) translateX(-1px);
          }
        }

        @keyframes foamBob {
          0%, 100% {
            transform: translateY(0);
            opacity: 1;
          }
          50% {
            transform: translateY(-3px);
            opacity: 0.9;
          }
        }
      `}</style>
    </>
  );
}
