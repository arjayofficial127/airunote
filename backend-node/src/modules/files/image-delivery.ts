import sharp from 'sharp';
import { createHash } from 'crypto';
import { getFile } from './storage';

export const imageWidths = [160, 360, 720, 1200, 1600] as const;
type File = {storageProvider: string; storageKey: string; checksum: string | null; mimeType: string};
type ImageResult = {body: Buffer; mime: string; etag: string};
const cache = new Map<string, ImageResult>();
const pending = new Map<string, Promise<ImageResult>>();
let cacheBytes = 0;
const budget = 32 * 1024 * 1024;

export async function convertImage(body: Buffer, mime: string, width: number): Promise<ImageResult> {
  let result = body;
  let type = mime;
  try {
    const image = sharp(body, {limitInputPixels: 40000000});
    const metadata = await image.metadata();
    // Never turn animated uploads into a still image.
    if ((metadata.pages ?? 1) <= 1) {
      const variant = await image.rotate().resize({width, withoutEnlargement: true})
        .webp({quality: 85, alphaQuality: 100, effort: 4}).toBuffer();
      if (variant.length < body.length) { result = variant; type = 'image/webp'; }
    }
  } catch { /* Existing originals remain usable if optimization fails. */ }
  return {body: result, mime: type, etag: '"' + createHash('sha256').update(result).digest('hex') + '"'};
}

/** Call only AFTER visibility/ownership checks. Bounded LRU and in-flight deduplication. */
export async function imageVariant(file: File, width: number): Promise<ImageResult | null> {
  const key = `${file.storageProvider}:${file.storageKey}:${file.checksum}:${width}:webp-v1`;
  const hit = cache.get(key);
  if (hit) { cache.delete(key); cache.set(key, hit); return hit; }
  const inflight = pending.get(key);
  if (inflight) return inflight;
  // Avoid an unbounded transform queue under concurrent cold requests.
  if (pending.size >= 4) return null;
  const task = (async () => {
    const result = await convertImage(await getFile(file.storageProvider, file.storageKey), file.mimeType, width);
    if (result.body.length <= budget) {
      while (cacheBytes + result.body.length > budget && cache.size) {
        const oldest = cache.keys().next().value!;
        cacheBytes -= cache.get(oldest)!.body.length; cache.delete(oldest);
      }
      cache.set(key, result); cacheBytes += result.body.length;
    }
    return result;
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}
