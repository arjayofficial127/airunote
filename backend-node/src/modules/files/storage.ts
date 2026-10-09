import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import sharp from 'sharp';
import path from 'path';
import { AppearanceError } from '../exam-appearance/service';

export function configuredProvider() {
  if (process.env.NODE_ENV === 'production' && process.env.FILE_UPLOADS_ENABLED !== 'true') return null;
  if (process.env.NODE_ENV !== 'production' && process.env.FILE_STORAGE_LOCAL_DIR) return 'local';
  if (
    process.env.STORAGE_BACKEND === 'r2' &&
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.FILES_R2_BUCKET_NAME
  )
    return 'r2';
  if (
    (!process.env.STORAGE_BACKEND || process.env.STORAGE_BACKEND === 'supabase') &&
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    (process.env.FILES_SUPABASE_BUCKET_NAME || process.env.SUPABASE_BUCKET_NAME)
  )
    return 'supabase';
  return null;
}
function localPath(key: string) {
  if (process.env.NODE_ENV === 'production' || !process.env.FILE_STORAGE_LOCAL_DIR)
    throw new AppearanceError('Local storage is unavailable.', 503);
  const root = path.resolve(process.env.FILE_STORAGE_LOCAL_DIR);
  const target = path.resolve(root, key);
  if (!target.startsWith(root + path.sep)) throw new AppearanceError('Invalid storage key.');
  return target;
}
function r2() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}
const supabaseBucket = () =>
  process.env.FILES_SUPABASE_BUCKET_NAME || process.env.SUPABASE_BUCKET_NAME!;
async function privateSupabase() {
  const client = supabase();
  const { data, error } = await client.storage.getBucket(supabaseBucket());
  if (error || !data || data.public)
    throw new AppearanceError('Native file storage requires a private Supabase bucket.', 503);
  return client;
}
function supabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}
export async function putFile(provider: string, key: string, data: Buffer, mime: string) {
  if (provider === 'local') {
    const target = localPath(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, data, { flag: 'w' });
    return;
  }
  if (provider === 'r2') {
    await r2().send(
      new PutObjectCommand({
        Bucket: process.env.FILES_R2_BUCKET_NAME,
        Key: key,
        Body: data,
        ContentType: mime,
      })
    );
    return;
  }
  if (provider === 'supabase') {
    const { error } = await (await privateSupabase()).storage
      .from(supabaseBucket())
      .upload(key, data, { contentType: mime, upsert: true });
    if (error) throw error;
    return;
  }
  throw new AppearanceError(
    'File storage is not configured. Built-in assets remain available.',
    503
  );
}
export async function getFile(provider: string, key: string): Promise<Buffer> {
  if (provider === 'local') return fs.readFile(localPath(key));
  if (provider === 'r2') {
    const result = await r2().send(
      new GetObjectCommand({ Bucket: process.env.FILES_R2_BUCKET_NAME, Key: key })
    );
    if (!result.Body) throw new Error('Empty object');
    return Buffer.from(await result.Body.transformToByteArray());
  }
  if (provider === 'supabase') {
    const { data, error } = await (await privateSupabase()).storage
      .from(supabaseBucket())
      .download(key);
    if (error) throw error;
    return Buffer.from(await data.arrayBuffer());
  }
  throw new AppearanceError('File storage is unavailable.', 503);
}
export async function removeFile(provider: string, key: string) {
  if (provider === 'local') {
    await fs.rm(localPath(key), { force: true });
    return;
  }
  if (provider === 'r2') {
    await r2().send(
      new DeleteObjectCommand({ Bucket: process.env.FILES_R2_BUCKET_NAME, Key: key })
    );
    return;
  }
  if (provider === 'supabase') {
    const { error } = await (await privateSupabase()).storage.from(supabaseBucket()).remove([key]);
    if (error) throw error;
    return;
  }
  throw new AppearanceError('File storage is unavailable.', 503);
}
export function detectType(buffer: Buffer): string | null {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return 'image/png';
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'image/jpeg';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP')
    return 'image/webp';
  if (buffer.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
  return null;
}

export async function validateImage(buffer: Buffer) {
  try {
    const info = await sharp(buffer, { limitInputPixels: 40000000 }).metadata();
    if (!info.width || !info.height || info.width > 12000 || info.height > 12000)
      throw new Error('dimensions');
  } catch {
    throw new AppearanceError(
      'Choose a valid image up to 12,000 pixels per side and 40 megapixels.'
    );
  }
}
