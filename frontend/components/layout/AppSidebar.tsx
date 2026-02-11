'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  appCode?: string;
  appName?: string;
}

export function AppSidebar({ isOpen, onClose, appCode, appName }: AppSidebarProps) {
  const pathname = usePathname();
  const [appSidebarState, setAppSidebarState] = useState<any>(null);

  // Extract app code from pathname if not provided
  const detectedAppCode = appCode || (() => {
    if (!pathname) return null;
    const match = pathname.match(/\/apps\/([^\/]+)/);
    return match ? match[1] : null;
  })();

  // Detect app name from app code
  const detectedAppName = appName || (() => {
    if (!detectedAppCode) return 'App';
    const names: Record<string, string> = {
      'post-app': 'Books & Posts',
      'footprints': 'Footprints',
      'files': 'Files',
      'forms': 'Forms',
      'hr': 'HR',
      'portfolio': 'Portfolio',
      'baseofclients': 'BaseOfClients',
      'airunote': 'Airunote',
    };
    return names[detectedAppCode] || detectedAppCode.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  })();

  // Check for app sidebar state (like PostApp's __postAppSidebarState) — must run before any conditional return
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkAppSidebar = () => {
      // Check for PostApp sidebar state
      if (detectedAppCode === 'post-app' && (window as any).__postAppSidebarState) {
        setAppSidebarState((window as any).__postAppSidebarState);
        return;
      }
      
      // Future: Check for other app sidebar states
      // if (detectedAppCode === 'footprints' && (window as any).__footprintsSidebarState) {
      //   setAppSidebarState((window as any).__footprintsSidebarState);
      //   return;
      // }
      
      setAppSidebarState(null);
    };

    checkAppSidebar();
    
    // Poll for app sidebar state (apps may load after this component)
    const interval = setInterval(checkAppSidebar, 100);
    return () => clearInterval(interval);
  }, [detectedAppCode]);

  // If app has its own sidebar, don't render placeholder
  const hasAppSidebar = appSidebarState !== null;
  const appsWithOwnSidebar = ['airunote', 'post-app'];
  const skipPlaceholder = (detectedAppCode && appsWithOwnSidebar.includes(detectedAppCode)) || hasAppSidebar;

  if (skipPlaceholder) {
    return null;
  }

  // Placeholder sidebar for apps without menu
  return (
    <aside
      className={`fixed left-0 w-64 bg-white border-r border-gray-200 flex flex-col z-40 transform transition-all duration-300 ease-in-out top-14 sm:top-14 ${
        isOpen 
          ? 'translate-x-0 opacity-100 pointer-events-auto lg:static lg:translate-x-0 lg:opacity-100 lg:pointer-events-auto' 
          : '-translate-x-full opacity-0 pointer-events-none lg:-translate-x-full lg:opacity-0 lg:pointer-events-none'
      }`}
      style={{ 
        height: 'calc(100vh - 3.5rem)',
      }}
    >
      {/* Menu header */}
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

      {/* Placeholder content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {detectedAppName} Menu
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Coming soon
          </p>
          <p className="text-xs text-gray-400">
            We&apos;re architecting the menu for this app.
          </p>
        </div>
      </div>
    </aside>
  );
}
