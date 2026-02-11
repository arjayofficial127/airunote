import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api', '') || 'http://localhost:4000';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params.path, 'DELETE');
}

async function handleRequest(
  request: NextRequest,
  pathSegments: string[],
  method: string
) {
  try {
    const path = `/api/${pathSegments.join('/')}`;
    const url = new URL(path, BACKEND_URL);
    
    // Forward query parameters
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    console.log(`[Proxy] ${method} ${path} -> ${url.toString()}`);

    // Get request body if present
    let body: string | undefined;
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        body = await request.text();
      } catch (e) {
        // No body
      }
    }

    // Get the frontend domain from the request
    // Try multiple sources in order of reliability:
    // 1. nextUrl.host (most reliable - the actual domain being accessed)
    // 2. x-forwarded-host (Vercel sets this with original host)
    // 3. host header (fallback)
    const frontendHost = 
      request.nextUrl.host || 
      request.headers.get('x-forwarded-host') || 
      request.headers.get('host') || 
      '';
    const frontendReferer = request.headers.get('referer') || '';
    
    // Log for debugging
    console.log(`[Proxy] Frontend domain detection:`, {
      'nextUrl.host': request.nextUrl.host,
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
      'host': request.headers.get('host'),
      'selected': frontendHost,
      'url': request.url,
    });
    
    // Forward request to backend
    const backendResponse = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies from the original request
        Cookie: request.headers.get('cookie') || '',
        // Forward other important headers
        'User-Agent': request.headers.get('user-agent') || '',
        // Add header to identify request origin (frontend)
        'X-Forwarded-From': frontendHost,
        // Forward Referer if present (for browser requests)
        ...(frontendReferer ? { 'Referer': frontendReferer } : {}),
      },
      body: body || undefined,
    });

    // Get response data
    const data = await backendResponse.text();
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = data;
    }

    // Create response with same status
    const response = NextResponse.json(jsonData, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
    });

    // Forward Set-Cookie headers from backend to client
    // This is crucial - it allows cookies to be set on the same domain (frontend)
    const setCookieHeaders = backendResponse.headers.getSetCookie();
    
    if (setCookieHeaders.length > 0) {
      console.log(`[Proxy] Forwarding ${setCookieHeaders.length} Set-Cookie headers`);
    }
    
    setCookieHeaders.forEach((cookieString) => {
      try {
        // Parse cookie string (format: "name=value; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=900")
        const parts = cookieString.split(';').map(p => p.trim());
        const [nameValue] = parts;
        const [name, ...valueParts] = nameValue.split('=');
        const value = valueParts.join('=');

        // Extract cookie options
        const options: any = {
          httpOnly: parts.some(p => p.toLowerCase() === 'httponly'),
          secure: parts.some(p => p.toLowerCase() === 'secure') || process.env.NODE_ENV === 'production',
          sameSite: parts.some(p => p.toLowerCase().includes('samesite=none')) 
            ? 'none' 
            : parts.some(p => p.toLowerCase().includes('samesite=lax'))
            ? 'lax'
            : 'strict',
          path: '/',
        };

        // Extract maxAge if present
        const maxAgePart = parts.find(p => p.toLowerCase().startsWith('max-age='));
        if (maxAgePart) {
          const maxAgeValue = maxAgePart.split('=')[1];
          options.maxAge = parseInt(maxAgeValue);
        }

        // Extract expires if present (convert to maxAge)
        const expiresPart = parts.find(p => p.toLowerCase().startsWith('expires='));
        if (expiresPart && !maxAgePart) {
          const expiresValue = expiresPart.split('=')[1];
          const expiresDate = new Date(expiresValue);
          options.maxAge = Math.floor((expiresDate.getTime() - Date.now()) / 1000);
        }

        // Set cookie on the frontend domain (same origin - no third-party cookie issues!)
        response.cookies.set(name.trim(), value, options);
        console.log(`[Proxy] Set cookie: ${name.trim()}`);
      } catch (error) {
        console.error(`[Proxy] Error parsing cookie: ${cookieString}`, error);
      }
    });

    console.log(`[Proxy] Response: ${backendResponse.status}, Set-Cookie headers: ${setCookieHeaders.length}`);

    return response;
  } catch (error: any) {
    console.error('[Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Proxy error', message: error.message },
      { status: 500 }
    );
  }
}

