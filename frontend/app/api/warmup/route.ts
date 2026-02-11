import { NextResponse } from 'next/server';

// Optional: Add secret to prevent abuse
const WARMUP_SECRET = process.env.WARMUP_SECRET;

export async function GET(request: Request) {
  // Optional security check
  const authHeader = request.headers.get('authorization');
  if (WARMUP_SECRET && authHeader !== `Bearer ${WARMUP_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const results: Record<string, any> = {};

  try {
    // Warmup backend API
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';
    const apiResponse = await fetch(`${apiUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    
    results.backend = {
      status: apiResponse.ok ? 'ok' : 'error',
      statusCode: apiResponse.status,
      responseTime: Date.now() - startTime,
    };

    // Warmup Next.js render (by calling health endpoint)
    try {
      const renderStart = Date.now();
      const renderUrl = new URL('/api/health', request.url);
      await fetch(renderUrl.toString(), {
        signal: AbortSignal.timeout(2000),
      });
      results.render = { 
        status: 'ok',
        responseTime: Date.now() - renderStart,
      };
    } catch (error) {
      results.render = { status: 'error', error: String(error) };
    }

    const totalTime = Date.now() - startTime;

    return NextResponse.json({
      status: 'warmed',
      timestamp: new Date().toISOString(),
      results,
      totalTime: `${totalTime}ms`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        results,
      },
      { status: 500 }
    );
  }
}

