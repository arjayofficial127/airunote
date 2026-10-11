'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { defaultExamMusic } from '@/lib/exam-appearance';
import { useExamAppearance, useExamPreview } from './ExamAppearanceProvider';

export function ExamBackgroundMusic() {
  const appearance = useExamAppearance();
  const preview = useExamPreview();
  const music = appearance.music ?? { ...defaultExamMusic, enabled: appearance.renderer === 'creator' };
  const audio = useRef<HTMLAudioElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const id = useId();
  useEffect(() => {
    const player = audio.current;
    if (!player || !music.enabled || preview) return;
    player.volume = music.volume;
    const start = () => { if (player.paused) void player.play().catch(() => {}); };
    const document = player.ownerDocument;
    document.addEventListener('pointerdown', start);
    document.addEventListener('keydown', start);
    return () => {
      document.removeEventListener('pointerdown', start);
      document.removeEventListener('keydown', start);
      player.pause();
    };
  }, [music.enabled, music.url, music.volume, preview]);
  useEffect(() => {
    if (!open) return;
    const document = box.current?.ownerDocument;
    const outside = (event: PointerEvent) => { if (!box.current?.contains(event.target as Node)) setOpen(false); };
    document?.addEventListener('pointerdown', outside);
    return () => document?.removeEventListener('pointerdown', outside);
  }, [open]);
  if (!music.enabled || !music.url) return null;
  const safeSource = music.sourceUrl.startsWith('https://') ? music.sourceUrl : undefined;
  return <>
    {!preview && <audio ref={audio} src={music.url} loop preload="none" />}
    {music.creditVisible && <div ref={box} className="exam-music-credit" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onKeyDown={(event) => { if (event.key === 'Escape') { setOpen(false); box.current?.querySelector('button')?.focus(); } }}>
      <button type="button" aria-label="About the background music" aria-expanded={open} aria-controls={id} onClick={() => setOpen(true)}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M9 18V5l12-2v13M9 9l12-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="18" cy="16" rx="3" ry="2"/></svg>
      </button>
      {open && <div id={id} className="exam-music-info">
        <span>Background music</span><strong>{music.title}</strong><p>{music.artist}</p>
        {safeSource ? <a href={safeSource} target="_blank" rel="noopener noreferrer">Music source ↗</a> : <p>{music.url === defaultExamMusic.url ? 'Original synthesized instrumental created for Airunote.' : 'Music selected by the exam administrator.'}</p>}
        {preview && <p>Music is silent in the appearance preview.</p>}
      </div>}
    </div>}
  </>;
}
