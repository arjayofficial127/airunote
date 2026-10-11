'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
const screens = ['entry', 'instructions', 'questions', 'completed', 'upcoming', 'ended', 'terminated', 'timed_out'];
const clamp = (value: number) => Math.min(2, Math.max(.01, value));
type Point = { x: number; y: number };

export function PreviewGallery({ mobile, fullscreen, renderScreen }: {
  mobile: boolean; fullscreen: boolean; renderScreen: (screen: string) => ReactNode;
}) {
  const [interactive, setInteractive] = useState(false);
  const canvas = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const output = useRef<HTMLOutputElement>(null);
  const camera = useRef({ x: 32, y: 32, zoom: mobile ? .4 : .15 });
  const animationFrame = useRef<number | null>(null);
  const pointers = useRef(new Map<number, Point>());
  const cardWidth = mobile ? 414 : 1920;
  const cardHeight = mobile ? 940 : 1150;
  const totalWidth = screens.length * cardWidth + (screens.length - 1) * 64;
  // Move one composited layer; never rerender seven React/iframe trees per gesture.
  const paint = useCallback(() => {
    if (animationFrame.current !== null) return;
    animationFrame.current = requestAnimationFrame(() => {
      animationFrame.current = null;
      const { x, y, zoom } = camera.current;
      if (track.current) track.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoom})`;
      if (output.current) output.current.textContent = `${Math.round(zoom * 100)}%`;
    });
  }, []);
  const pan = useCallback((x: number, y: number) => {
    camera.current.x += x; camera.current.y += y; paint();
  }, [paint]);
  const zoomAt = useCallback((next: number, x?: number, y?: number) => {
    const el = canvas.current;
    if (!el) return;
    const px = x ?? el.clientWidth / 2, py = y ?? el.clientHeight / 2;
    const value = clamp(next), ratio = value / camera.current.zoom;
    camera.current = { x: px - (px - camera.current.x) * ratio, y: py - (py - camera.current.y) * ratio, zoom: value };
    paint();
  }, [paint]);
  const fit = useCallback(() => {
    const el = canvas.current;
    if (!el) return;
    const zoom = clamp(Math.min((el.clientWidth - 64) / totalWidth, (el.clientHeight - 64) / cardHeight));
    camera.current = { x: (el.clientWidth - totalWidth * zoom) / 2, y: (el.clientHeight - cardHeight * zoom) / 2, zoom };
    paint();
  }, [totalWidth, cardHeight, paint]);
  const fitOne = () => {
    const el = canvas.current;
    if (!el) return;
    const center = (el.clientWidth / 2 - camera.current.x) / camera.current.zoom;
    const index = Math.max(0, Math.min(screens.length - 1, Math.round((center - cardWidth / 2) / (cardWidth + 64))));
    const zoom = clamp(Math.min((el.clientWidth - 64) / cardWidth, (el.clientHeight - 64) / cardHeight));
    camera.current = { x: el.clientWidth / 2 - (index * (cardWidth + 64) + cardWidth / 2) * zoom, y: (el.clientHeight - cardHeight * zoom) / 2, zoom };
    paint();
  };
  useEffect(() => { fit(); }, [fit, fullscreen]);
  useEffect(() => {
    const el = canvas.current;
    if (!el || interactive) return;
    const doc = el.ownerDocument;
    const inside = (event: Event) => event.composedPath().includes(el);
    let nativeGesture = false;
    const wheel = (event: WheelEvent) => {
      if (!inside(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (nativeGesture) return;
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientHeight : 1;
      const dx = event.deltaX * unit, dy = event.deltaY * unit;
      if (event.ctrlKey || event.metaKey) {
        const rect = el.getBoundingClientRect();
        zoomAt(camera.current.zoom * Math.exp(-dy * .01), event.clientX - rect.left, event.clientY - rect.top);
      } else {
        // Two-finger scrolling pans; laptop pinch is a control-wheel gesture.
        pan(event.shiftKey && !dx ? -dy : -dx, event.shiftKey && !dx ? 0 : -dy);
      }
    };
    type Gesture = Event & { scale?: number; clientX?: number; clientY?: number };
    let baseZoom = 1;
    const start = (event: Event) => {
      if (!inside(event)) return;
      event.preventDefault(); event.stopPropagation(); nativeGesture = true; baseZoom = camera.current.zoom;
    };
    const change = (event: Event) => {
      if (!nativeGesture) return;
      event.preventDefault(); event.stopPropagation();
      const g = event as Gesture, rect = el.getBoundingClientRect();
      zoomAt(baseZoom * (g.scale ?? 1), (g.clientX ?? rect.left + rect.width / 2) - rect.left, (g.clientY ?? rect.top + rect.height / 2) - rect.top);
    };
    const end = (event: Event) => { if (nativeGesture) { event.preventDefault(); nativeGesture = false; } };
    // Capture before browser/page zoom and before embedded preview event handlers.
    doc.addEventListener('wheel', wheel, { passive: false, capture: true });
    doc.addEventListener('gesturestart', start, { passive: false, capture: true });
    doc.addEventListener('gesturechange', change, { passive: false, capture: true });
    doc.addEventListener('gestureend', end, { passive: false, capture: true });
    return () => {
      doc.removeEventListener('wheel', wheel, true);
      doc.removeEventListener('gesturestart', start, true);
      doc.removeEventListener('gesturechange', change, true);
      doc.removeEventListener('gestureend', end, true);
      if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    };
  }, [interactive, pan, zoomAt]);
  return <div className="preview-gallery" data-interactive={interactive}>
    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2 text-xs text-slate-600">
      <span>{mobile ? `${screens.length} phones` : `${screens.length} desktops · 1920 × 1080`} · {interactive ? 'Click, type, and scroll inside previews' : 'Drag or two-finger scroll to pan · Pinch to zoom'}</span>
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" className="h-11 rounded-lg border bg-white px-3 font-semibold" aria-pressed={interactive} onClick={() => { pointers.current.clear(); setInteractive(!interactive); }}>{interactive ? 'Pan mode' : 'Interact'}</button>
        <button type="button" className="preview-tool" aria-label="Zoom out" onClick={() => zoomAt(camera.current.zoom / 1.25)}>−</button>
        <output ref={output} className="w-12 text-center tabular-nums" aria-label="Zoom level" />
        <button type="button" className="preview-tool" aria-label="Zoom in" onClick={() => zoomAt(camera.current.zoom * 1.25)}>+</button>
        <button type="button" className="h-11 rounded-lg px-3 hover:bg-white" onClick={fitOne}>Fit one</button>
        <button type="button" className="h-11 rounded-lg px-3 hover:bg-white" onClick={fit}>Fit all</button>
      </div>
    </div>
    <div ref={canvas} className="preview-gallery-canvas" style={{ position: 'relative', overflow: 'hidden', height: fullscreen ? 'calc(100dvh - 210px)' : 'min(70dvh, 720px)', minHeight: 320 }} tabIndex={0} aria-label="Exam gallery. Drag or scroll to pan. Pinch or control-scroll to zoom."
      onKeyDown={e => {
        if (interactive) return;
        if (['+', '=', '-', '0', '1', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
        if (e.key === '+' || e.key === '=') zoomAt(camera.current.zoom * 1.25);
        if (e.key === '-') zoomAt(camera.current.zoom / 1.25);
        if (e.key === '0') fit();
        if (e.key === '1') fitOne();
        if (e.key === 'ArrowLeft') pan(80, 0);
        if (e.key === 'ArrowRight') pan(-80, 0);
        if (e.key === 'ArrowUp') pan(0, 80);
        if (e.key === 'ArrowDown') pan(0, -80);
      }}
      onPointerDown={e => {
        if (interactive) return;
        if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
        e.preventDefault(); e.currentTarget.focus({ preventScroll: true });
        e.currentTarget.setPointerCapture(e.pointerId);
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }}
      onPointerMove={e => {
        if (interactive) return;
        const previous = pointers.current.get(e.pointerId);
        if (!previous) return;
        const old = Array.from(pointers.current.values());
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const points = Array.from(pointers.current.values());
        if (points.length === 2) {
          const before = Math.hypot(old[0].x - old[1].x, old[0].y - old[1].y);
          if (before < 1) return;
          const after = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
          const rect = e.currentTarget.getBoundingClientRect();
          const cx = (old[0].x + old[1].x) / 2, cy = (old[0].y + old[1].y) / 2;
          zoomAt(camera.current.zoom * after / before, cx - rect.left, cy - rect.top);
          pan((points[0].x + points[1].x) / 2 - cx, (points[0].y + points[1].y) / 2 - cy);
        } else if (points.length === 1) pan(e.clientX - previous.x, e.clientY - previous.y);
      }}
      onPointerUp={e => pointers.current.delete(e.pointerId)}
      onPointerCancel={e => pointers.current.delete(e.pointerId)}
      onLostPointerCapture={e => pointers.current.delete(e.pointerId)}>
      {!interactive && <div aria-hidden="true" className="absolute inset-0 z-[2]" />}
      <div ref={track} className="preview-gallery-track" style={{ top: 0, left: 0, width: totalWidth, willChange: 'transform' }}>
          {screens.map((screen, index) => <article key={screen} style={{ width: cardWidth, flexShrink: 0 }} aria-label={`${screen.replace('_', ' ')} preview`}>
            <h4 className="mb-4 text-xl font-semibold capitalize text-slate-600">{String(index + 1).padStart(2, '0')} · {screen.replace('_', ' ')}</h4>
            <div className="preview-gallery-screen">{renderScreen(screen)}</div>
          </article>)}
      </div>
    </div>
  </div>;
}
