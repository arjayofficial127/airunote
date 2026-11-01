'use client';
import { useRef, useState } from 'react';

export function PaneResize({ label, width, min, onResize }: { label: string; width: number; min: number; onResize: (width: number) => void }) {
  const drag = useRef<{ x: number; width: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  function finish() { drag.current = null; setDragging(false); }
  return <button type="button" className="an-workspace-resize" role="separator" aria-label={'Resize ' + label} aria-orientation="vertical"
    data-dragging={dragging}
    aria-valuemin={min} aria-valuemax={6000} aria-valuenow={Math.round(width)}
    onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); onResize(width + (event.key === 'ArrowRight' ? 24 : -24)); } }}
    onPointerDown={event => { event.preventDefault(); drag.current = { x: event.clientX, width }; setDragging(true); event.currentTarget.setPointerCapture(event.pointerId); }}
    onPointerMove={event => { if (drag.current) onResize(drag.current.width + event.clientX - drag.current.x); }}
    onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish} />;
}
