'use client';

import { usePathname } from 'next/navigation';

export default function ConditionalFooter() {
  const pathname = usePathname();
  
  // Hide footer on dashboard routes (routes that have sidebar)
  const isDashboardRoute = pathname?.startsWith('/orgs/');
  
  if (isDashboardRoute) {
    return null;
  }

  // Footer commented out - copyright is now in sidebar
  return null;
  
  /* return (
    <footer className="mt-auto border-t border-gray-200 bg-white py-4">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="text-center text-sm text-gray-500">
          <p>© 2020–2025 AOTECH / AtomicFuel.</p>
          <p>All rights reserved.</p>
        </div>
      </div>
    </footer>
  ); */
}

