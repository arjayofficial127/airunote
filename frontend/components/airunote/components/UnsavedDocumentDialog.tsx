'use client';

import { useRef } from 'react';

export function UnsavedDocumentDialog({ onKeep, onLeave }: { onKeep: () => void; onLeave: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/35 p-4" onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onKeep(); }
    if (event.key === 'Tab') {
      const buttons = panel.current?.querySelectorAll('button');
      const first = buttons?.[0]; const last = buttons?.[1];
      if (event.shiftKey && event.target === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && event.target === last) { event.preventDefault(); first?.focus(); }
    }
  }}>
    <div ref={panel} role="alertdialog" aria-modal="true" aria-labelledby="unsaved-document-title" aria-describedby="unsaved-document-detail" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
      <h2 id="unsaved-document-title" className="text-lg font-semibold text-slate-900">Keep your changes?</h2>
      <p id="unsaved-document-detail" className="mt-2 text-sm leading-6 text-slate-600">This document has unsaved changes. Keep editing to save them, or discard this draft and leave.</p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button autoFocus type="button" onClick={onKeep} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Keep editing</button>
        <button type="button" onClick={onLeave} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">Discard and leave</button>
      </div>
    </div>
  </div>;
}
