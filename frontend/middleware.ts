import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Track last warmup time
let lastWarmup = 0;
const WARMUP_INTERVAL = 30000; // 30 seconds

// Get API base URL for middleware
function getApiBaseUrl(request: NextRequest): string {
  // In middleware, we're on the server
  // Use proxy route if in production or if NEXT_PUBLIC_API_BASE_URL is not set
  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiUrl || apiUrl.includes('localhost')) {
    // Use proxy route (same origin)
    return `${request.nextUrl.origin}/api/proxy`;
  }
  // Use direct backend URL
  return apiUrl;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    /\.(pdf|png|jpg|jpeg|gif|svg|webp|ico|json|txt|css|js|woff|woff2|ttf|eot)$/.test(pathname)
  ) {
    return NextResponse.next();
  }
  
  // Handle redirect logic for /dashboard route
  if (pathname === '/dashboard') {
    try {
      // Get all cookies from the request
      const cookies = request.cookies.getAll();
      const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      
      // Get API base URL
      const apiBaseUrl = getApiBaseUrl(request);
      
      // Check if user is authenticated by trying to get orgs
      const orgsUrl = `${apiBaseUrl}/orgs`;
      
      const orgsResponse = await fetch(orgsUrl, {
        method: 'GET',
        headers: {
          'Cookie': cookieHeader,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      // If not authenticated, let the page handle redirect to login
      if (!orgsResponse.ok) {
        return NextResponse.next();
      }
      
      const orgsData = await orgsResponse.json();
      const orgs = orgsData?.data || [];
      
      // Check if user is super admin
      const meFullUrl = `${apiBaseUrl}/auth/me/full`;
      
      let isSuperAdmin = false;
      try {
        const meResponse = await fetch(meFullUrl, {
          method: 'GET',
          headers: {
            'Cookie': cookieHeader,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (meResponse.ok) {
          const meData = await meResponse.json();
          isSuperAdmin = meData?.data?.isSuperAdmin || false;
        }
      } catch (err) {
        // If check fails, continue with org-based redirect
      }
      
      // Super admins stay on dashboard
      if (isSuperAdmin) {
        return NextResponse.next();
      }
      
      // Redirect based on org count
      if (orgs.length === 0) {
        // No orgs - go to orgs page to create one
        return NextResponse.redirect(new URL('/orgs', request.url));
      } else if (orgs.length === 1) {
        // One org - go directly to Airunote
        return NextResponse.redirect(new URL(`/orgs/${orgs[0].id}/airunote`, request.url));
      } else {
        // Multiple orgs - show org selection page
        return NextResponse.redirect(new URL('/orgs', request.url));
      }
    } catch (error) {
      // If API call fails, let the page handle it
      console.error('[Middleware] Error checking orgs:', error);
      return NextResponse.next();
    }
  }
  
  const now = Date.now();
  
  // Warmup database if idle for more than 30 seconds
  if (now - lastWarmup > WARMUP_INTERVAL) {
    lastWarmup = now;
    
    // Fire-and-forget warmup (non-blocking)
    warmupDatabase().catch(() => {
      // Silently fail - warmup is best effort
    });
  }
  
  return NextResponse.next();
}

async function warmupDatabase() {
  try {
    // Lightweight ping to backend API (which warms DB connection)
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';
    await fetch(`${apiUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      // Fast timeout - we don't want to block
      signal: AbortSignal.timeout(2000),
    });
  } catch (error) {
    // Ignore errors - warmup is best effort
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (we'll handle those separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static file extensions (pdf, images, fonts, etc.)
     * 
     * Using a simple pattern that matches most paths, exclusions handled in middleware
     */
    '/((?!api|_next|favicon\\.ico).*)',
  ],
};

