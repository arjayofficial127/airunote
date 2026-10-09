'use client';
import { useEffect, useRef } from 'react';
export function SectionDeleteDialog({ title, count, destination, destinations, last, onDestination, onCancel, onConfirm }: {
  title: string; count: number; destination: string; destinations: { value: string; label: string }[]; last: boolean;
  onDestination: (value: string) => void; onCancel: () => void; onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const select = useRef<HTMLSelectElement>(null);
  useEffect(() => { const element = dialog.current!; const previous = document.activeElement as HTMLElement | null; element.showModal(); select.current?.focus(); return () => { element.close(); if (previous?.isConnected) previous.focus(); }; }, []);
  const noun = count === 1 ? 'question' : 'questions';
  return <dialog ref={dialog} aria-labelledby="section-delete-title" aria-describedby="section-delete-description" onCancel={onCancel} className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/40">
    <div className="max-h-[85dvh] overflow-y-auto p-5 sm:p-6">
      <h2 id="section-delete-title" className="break-words text-xl font-semibold">Delete “{title}”?</h2>
      <p id="section-delete-description" className="mt-3 text-sm text-slate-600">This section contains {count} {noun}. Choose where to move {count === 1 ? 'it' : 'them'} before deleting the section.</p>
      <label className="mt-5 block text-sm font-medium">Move questions to<select ref={select} value={destination} onChange={event => onDestination(event.target.value)} className="mt-2 w-full min-w-0 rounded-xl border border-slate-300 p-3">{destinations.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <p className="mt-3 text-sm text-slate-600">All {count} {noun} will be kept and added to the end of the selected group.</p>
      {!destination && <p className="mt-2 text-sm text-slate-500">General questions appear before named sections.</p>}
      {last && <p className="mt-2 text-sm text-slate-500">No named sections will remain. Your exam will still work normally.</p>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="rounded-xl border px-4 py-3 text-sm">Cancel</button><button type="button" onClick={onConfirm} className="rounded-xl bg-red-700 px-4 py-3 text-sm font-semibold text-white">Move {count} {noun} &amp; delete section</button></div>
    </div>
  </dialog>;
}
