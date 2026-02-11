'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useOrgPermissions } from '@/hooks/useOrgPermissions';
import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { type Org } from '@/lib/api/orgs';

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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  
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

    if (context === 'org' && orgId) {
      const items: NavItem[] = [
        { href: `/orgs/${orgId}/dashboard`, label: 'Dashboard', subtitle: null },
      ];

      items.push(
        { href: `/orgs/${orgId}/posts`, label: 'Posts', subtitle: null },
        { href: `/orgs/${orgId}/collections`, label: 'Collections', subtitle: null },
        { href: `/orgs/${orgId}/members`, label: 'Members', subtitle: null },
        { href: `/orgs/${orgId}/settings`, label: 'Settings', subtitle: null },
      );

      return items;
    }

    return [];
  };

  const navItems = getNavItems();

  const contextualItem = { label: '', href: '', parent: null as null };

  const isActive = (href: string): boolean => {
    if (!pathname) return false;
    if (href === '#') return false;
    
    // Direct path match
    if (pathname === href || pathname.startsWith(href + '/')) {
      return true;
    }
    
    return false;
  };

  const contextualParentHref = '';
  const isContextualParentInNav = false;

  return (
    <>
      {/* Sidebar - respects isOpen state on all screen sizes */}
      {/* IMPORTANT: Always fixed positioning - content adjusts via margin-left, top bar NEVER hidden */}
      <aside
        className={`fixed left-0 w-64 ${showTestMenuBackground ? 'bg-transparent' : 'bg-white'} border-r border-gray-200 flex flex-col z-40 transform transition-all duration-300 ease-in-out top-14 sm:top-14 ${
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
          {/* Menu header with close button - shown on all screen sizes */}
          {onClose && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-900">Menu</span>
              <button
                onClick={onClose}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition"
                aria-label="Close sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        
        {/* Header section - Super Admin or Org context with toggle button */}
          {isOrgReady && ((context === 'dashboard' && isSuperAdmin) || context === 'org') ? (
          <div 
            className={`px-4 py-3 border-b border-gray-200 flex-shrink-0 min-h-[4.5rem] ${
              isOpen ? 'cursor-default bg-gray-100' : 'cursor-pointer hover:bg-gray-50'
            }`}
            onClick={!isOpen && onToggle ? onToggle : undefined}
          >
            {/* Content that shows when sidebar is open - no separate animation, moves with sidebar */}
            {isOpen && (
              <div>
                {context === 'dashboard' && isSuperAdmin ? (
                  <>
                    <div className="text-base font-medium text-gray-900">
                      The Architect-King
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">Super Admin</div>
                  </>
                ) : (
                  <>
                    <div className="text-base font-medium text-gray-900">
                      {org?.name || 'Organization'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{role || 'Admin'}</div>
                    {/* Loading state for org details */}
                    {isPermissionsLoading && (
                      <div className="flex items-center gap-2 mt-2">
                        <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-xs text-gray-600">Org details loading</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            
            {/* Left arrow that shows when sidebar is closed - no separate animation */}
            {!isOpen && onToggle && (
              <div className="flex items-center justify-center h-full min-h-[3rem]">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </div>
            )}
          </div>
          ) : null}

          {isOrgReady && (
          <nav className="flex-1 overflow-y-auto min-h-0 pt-2">
          {/* Show menu items progressively - non-app items immediately, apps when ready */}
          {isPermissionsLoading && context === 'org' ? (
            <div className="space-y-1">
              {/* Full skeleton only while permissions are loading */}
              <div className="h-12 bg-gray-200 rounded animate-pulse mx-2 mb-1" />
              <div className="space-y-1">
                <div className="h-12 bg-gray-200 rounded animate-pulse mx-2 mb-1" />
                <div className="ml-6 space-y-0.5 border-l-2 border-gray-200">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-10 bg-gray-200 rounded animate-pulse mx-2 mb-0.5" />
                  ))}
                </div>
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-200 rounded animate-pulse mx-2 mb-1" />
              ))}
            </div>
          ) : (
            <>
              {navItems.map((item) => {
                  const hasChildren = item.children && item.children.length > 0;
                  const isExpanded = hasChildren;
                  const itemIsActive = isActive(item.href) || (hasChildren && item.children?.some(child => isActive(child.href)));

                  return (
                    <div key={item.href || item.label} className="mb-1">
                      {hasChildren ? (
                        <>
                          <button
                            onClick={() => {}}
                            className={`w-full flex items-center justify-between py-2.5 px-4 transition ${
                              itemIsActive
                                ? 'bg-cyan-50 text-cyan-700 font-medium'
                                : 'text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`flex flex-col text-left flex-1 min-w-0`}>
                              <span className="whitespace-nowrap text-sm">{item.label}</span>
                              {item.subtitle && (
                                <span className="text-xs text-gray-500 mt-0.5 whitespace-nowrap">{item.subtitle}</span>
                              )}
                            </div>
                            <svg
                              className={`w-4 h-4 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''} mr-2`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          {isExpanded && (
                            <div className="ml-4 space-y-0.5 border-l-2 border-gray-200">
                              {item.children?.map((child) => {
                                const childIsActive = isActive(child.href);
                                const isContextualParent = contextualParentHref !== '' && child.href === contextualParentHref;
                                
                                return (
                                  <div key={child.href}>
                                    <Link
                                      href={child.href}
                                      onClick={onNavigate}
                                      className={`relative flex items-center justify-between py-2.5 px-4 transition ${
                                        childIsActive
                                          ? 'bg-cyan-50 text-cyan-700 font-medium'
                                          : 'text-gray-900 hover:bg-gray-50'
                                      }`}
                                    >
                                      <div className={`flex flex-col flex-1 min-w-0`}>
                                        <span className="text-sm whitespace-nowrap font-medium">{child.label}</span>
                                        {child.subtitle && (
                                          <span className="text-xs opacity-75 whitespace-nowrap mt-0.5">{child.subtitle}</span>
                                        )}
                                      </div>
                                      {childIsActive ? (
                                        <div className="absolute right-0 flex items-center flex-shrink-0 mr-2">
                                          <svg
                                            className="w-2 h-2 text-cyan-500"
                                            viewBox="0 0 8 8"
                                            fill="currentColor"
                                          >
                                            <path d="M0 0L8 4L0 8V0Z" />
                                          </svg>
                                        </div>
                                      ) : null}
                                    </Link>
                                    {isContextualParent && contextualItem.parent && (
                                      <>
                                        <div className="h-px bg-gray-200 my-2" />
                                        <Link
                                          href={contextualItem.href}
                                          onClick={onNavigate}
                                          className="flex items-center justify-between px-4 py-2 transition bg-gray-50 text-gray-700 hover:bg-gray-100 ml-2"
                                        >
                                          <div className="flex flex-col">
                                            <span className="text-xs font-medium">{contextualItem.label}</span>
                                          </div>
                                        </Link>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      ) : (
                        <Link
                          href={item.href}
                          onClick={onNavigate}
                          className={`relative flex items-center justify-between py-2.5 px-4 transition ${
                            itemIsActive
                              ? 'bg-cyan-50 text-cyan-700 font-medium'
                              : 'text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          <div className={`flex flex-col flex-1 min-w-0`}>
                            <span className="whitespace-nowrap text-sm">{item.label}</span>
                            {item.subtitle && (
                              <span className="text-xs text-gray-500 mt-0.5 whitespace-nowrap truncate">{item.subtitle}</span>
                            )}
                          </div>
                          {itemIsActive ? (
                            <div className="absolute right-0 flex items-center flex-shrink-0 mr-2">
                              <svg
                                className="w-2 h-2 text-cyan-600"
                                viewBox="0 0 8 8"
                                fill="currentColor"
                              >
                                <path d="M0 0L8 4L0 8V0Z" />
                              </svg>
                            </div>
                          ) : null}
                        </Link>
                      )}
                    </div>
                  );
                })}
            </>
          )}
          
          {/* Show contextual item if it doesn't have a parent in navItems */}
          {contextualItem.parent && (contextualParentHref === '' || !isContextualParentInNav) && (
            <>
              <div className="h-px bg-gray-200 my-2" />
              <Link
                href={contextualItem.href}
                onClick={onNavigate}
                className="flex items-center justify-between px-4 py-2 transition bg-gray-50 text-gray-700 hover:bg-gray-100 ml-2"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-medium">{contextualItem.label}</span>
                </div>
              </Link>
            </>
          )}
          </nav>
          )}
        
        {/* Footer in sidebar - fixed at bottom */}
          {isOrgReady && (
            <footer className="py-3 px-4 flex-shrink-0">
              <div className="text-xs text-gray-500 text-center">
                <p>© 2020–2025 AOTECH / AtomicFuel.</p>
                <p>All rights reserved.</p>
              </div>
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
