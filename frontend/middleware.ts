import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Track last warmup time
let lastWarmup = 0;
const WARMUP_INTERVAL = 30000; // 30 seconds

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

