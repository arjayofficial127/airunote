'use client';

export function DocumentMoreMenu({ onDelete }: { onDelete: () => Promise<void> }) {
  return <details className="relative">
    <summary className="cursor-pointer list-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 focus-visible:outline-blue-600" aria-label="More document actions">More <span aria-hidden="true">⌄</span></summary>
    <div className="absolute right-0 z-30 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
      <button type="button" onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); void onDelete(); }} className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-red-700 hover:bg-red-50">Delete document…</button>
    </div>
  </details>;
}
