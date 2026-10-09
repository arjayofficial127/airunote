'use client';
import { useEffect, useRef } from 'react';
export function LeaveExamDialog({ onCancel, onLeave }: { onCancel: () => void; onLeave: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; const previous = document.activeElement as HTMLElement | null; dialog.showModal(); return () => { dialog.close(); if (previous?.isConnected) previous.focus(); }; }, []);
  return <dialog ref={ref} onCancel={onCancel} aria-labelledby="leave-exam-title" className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border bg-white p-6 shadow-xl backdrop:bg-slate-950/40"><h2 id="leave-exam-title" className="text-lg font-semibold">Leave without saving?</h2><p className="mt-3 text-sm text-slate-600">Your exam has unsaved changes. Stay here to save them before leaving.</p><div className="mt-5 flex flex-wrap justify-end gap-2"><button autoFocus type="button" onClick={onCancel} className="rounded-xl border px-4 py-3">Keep editing</button><button type="button" onClick={onLeave} className="rounded-xl bg-red-700 px-4 py-3 text-white">Leave without saving</button></div></dialog>;
}
