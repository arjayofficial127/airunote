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
    // Build backend URL
    const path = `/api/${pathSegments.join('/')}`;
    const url = new URL(path, BACKEND_URL);
    
    // Forward query parameters
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    // Get request body for non-GET/DELETE methods
    let body: string | undefined;
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        body = await request.text();
      } catch {
        // No body
      }
    }

    // Build headers - forward only necessary headers
    const headers: Record<string, string> = {};
    
    // Content-Type (only if body exists)
    if (body) {
      const contentType = request.headers.get('content-type');
      if (contentType) {
        headers['Content-Type'] = contentType;
      } else {
        headers['Content-Type'] = 'application/json';
      }
    }
    
    // Cookie (CRITICAL for authentication)
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
      // Debug: Log cookie presence (without value for security)
      console.log(`[Proxy] Cookie header present: ${cookieHeader.length} chars, contains accessToken: ${cookieHeader.includes('accessToken')}`);
    } else {
      console.warn(`[Proxy] ⚠️ NO Cookie header received from client`);
    }
    
    // Authorization (CRITICAL for authentication)
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
      console.log(`[Proxy] Authorization header present: ${authHeader.substring(0, 20)}...`);
    } else {
      console.log(`[Proxy] No Authorization header (relying on cookies)`);
    }
    
    // User-Agent
    const userAgent = request.headers.get('user-agent');
    if (userAgent) {
      headers['User-Agent'] = userAgent;
    }
    
    // Referer
    const referer = request.headers.get('referer');
    if (referer) {
      headers['Referer'] = referer;
    }

    // Debug: Log what we're sending to backend
    console.log(`[Proxy] Forwarding to backend: ${method} ${url.toString()}`);
    console.log(`[Proxy] Headers being sent:`, {
      hasCookie: !!headers['Cookie'],
      cookieLength: headers['Cookie']?.length || 0,
      hasAuthorization: !!headers['Authorization'],
      hasContentType: !!headers['Content-Type'],
      headerKeys: Object.keys(headers),
    });

    // Forward request to backend
    const backendResponse = await fetch(url.toString(), {
      method,
      headers,
      body: body || undefined,
    });
    
    console.log(`[Proxy] Backend response: ${backendResponse.status} ${backendResponse.statusText}`);

    // Get response data
    const data = await backendResponse.text();
    let jsonData: any;
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
    const setCookieHeaders = backendResponse.headers.getSetCookie();
    for (const cookieString of setCookieHeaders) {
      try {
        // Parse cookie: "name=value; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=900"
        const parts = cookieString.split(';').map(p => p.trim());
        const [nameValue] = parts;
        const [name, ...valueParts] = nameValue.split('=');
        const value = valueParts.join('=');

        // Extract cookie attributes
        const options: {
          httpOnly?: boolean;
          secure?: boolean;
          sameSite?: 'strict' | 'lax' | 'none';
          path?: string;
          maxAge?: number;
        } = {};

        // HttpOnly
        if (parts.some(p => p.toLowerCase() === 'httponly')) {
          options.httpOnly = true;
        }

        // Secure
        if (parts.some(p => p.toLowerCase() === 'secure')) {
          options.secure = true;
        } else if (process.env.NODE_ENV === 'production') {
          options.secure = true;
        }

        // SameSite
        const sameSitePart = parts.find(p => p.toLowerCase().startsWith('samesite='));
        if (sameSitePart) {
          const sameSiteValue = sameSitePart.split('=')[1].toLowerCase();
          if (sameSiteValue === 'none' || sameSiteValue === 'lax' || sameSiteValue === 'strict') {
            options.sameSite = sameSiteValue as 'strict' | 'lax' | 'none';
          }
        }

        // Path
        const pathPart = parts.find(p => p.toLowerCase().startsWith('path='));
        if (pathPart) {
          options.path = pathPart.split('=')[1];
        } else {
          options.path = '/';
        }

        // Max-Age
        const maxAgePart = parts.find(p => p.toLowerCase().startsWith('max-age='));
        if (maxAgePart) {
          const maxAgeValue = parseInt(maxAgePart.split('=')[1], 10);
          if (!isNaN(maxAgeValue)) {
            options.maxAge = maxAgeValue;
          }
        } else {
          // Expires (convert to maxAge)
          const expiresPart = parts.find(p => p.toLowerCase().startsWith('expires='));
          if (expiresPart) {
            const expiresValue = expiresPart.split('=')[1];
            const expiresDate = new Date(expiresValue);
            if (!isNaN(expiresDate.getTime())) {
              options.maxAge = Math.floor((expiresDate.getTime() - Date.now()) / 1000);
            }
          }
        }

        // Set cookie on frontend domain
        response.cookies.set(name.trim(), value, options);
      } catch (error) {
        // Silently skip malformed cookies
      }
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Proxy error', message: error.message },
      { status: 500 }
    );
  }
}
