'use client';
import { useState, type ImgHTMLAttributes } from 'react';
import manifest from '@/lib/exam-image-manifest.json';

type Entry = { width: number; height: number; variants: {width: number; url: string}[] };
const assets: Record<string, Entry> = manifest;
const widths = [160, 360, 720, 1200, 1600];

/** One img element preserves existing layer selectors and animation geometry. */
export function ExamImage({src, sizes = '(max-width: 700px) 90vw, 900px', onError, ...props}: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState<string>();
  const entry = src ? assets[src] : undefined;
  const upload = src && /\/public\/exam-assets\/[0-9a-f-]+$/i.test(src);
  const optimize = src && failed !== src && (entry || upload);
  const variants = entry?.variants ?? (upload ? widths.map(width => ({width, url: `${src}?w=${width}&format=webp`})) : []);
  const fallback = variants.find(v => v.width >= 720) ?? variants.at(-1);
  return <img {...props} src={optimize ? fallback?.url : src}
    srcSet={optimize ? variants.map(v => `${v.url} ${v.width}w`).join(', ') : undefined}
    sizes={optimize ? sizes : undefined} decoding="async"
    onError={event => { if (optimize) setFailed(src); else onError?.(event); }} />;
}
