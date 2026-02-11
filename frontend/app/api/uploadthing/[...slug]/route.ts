import { createRouteHandler } from 'uploadthing/next';
import { ourFileRouter } from '@/src/lib/uploadthing/core';
import { NextRequest, NextResponse } from 'next/server';

// Log on module load - this MUST execute if file is loaded
console.log('[UploadThing Route] ⚡ FILE LOADED (v7) ⚡');
console.log('[UploadThing Route] UPLOADTHING_TOKEN:', process.env.UPLOADTHING_TOKEN ? 'SET ✅' : 'NOT SET ❌');
console.log('[UploadThing Route] UPLOADTHING_SECRET:', process.env.UPLOADTHING_SECRET ? 'SET ✅' : 'NOT SET ❌');

// Try to create handler - wrap in try-catch to prevent module load failure
let handler: { GET: any; POST: any } | null = null;

try {
  handler = createRouteHandler({
    router: ourFileRouter,
  });
  console.log('[UploadThing Route] ✅ Handler created successfully');
} catch (error: any) {
  console.error('[UploadThing Route] ❌ Handler creation failed:', error);
  console.error('[UploadThing Route] Error:', error?.message);
}

// Always export handlers - even if handler is null, route will be recognized
export async function GET(req: NextRequest, context: any) {
  console.log('[UploadThing Route] ===== GET REQUEST =====', req.url);
  
  if (!handler) {
    console.error('[UploadThing Route] Handler is null');
    return NextResponse.json(
      { error: 'UploadThing not configured', message: 'Check server logs' },
      { status: 500 }
    );
  }
  
  return handler.GET(req, context);
}

export async function POST(req: NextRequest, context: any) {
  console.log('[UploadThing Route] ===== POST REQUEST =====', req.url);
  
  if (!handler) {
    console.error('[UploadThing Route] Handler is null');
    return NextResponse.json(
      { error: 'UploadThing not configured', message: 'Check server logs' },
      { status: 500 }
    );
  }
  
  return handler.POST(req, context);
}

console.log('[UploadThing Route] ✅ Route handlers exported');

