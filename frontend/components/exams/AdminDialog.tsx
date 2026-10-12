'use client';
import { useEffect, useRef, type ReactNode } from 'react';
export function AdminDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        close.current();
      }}
      aria-label={title}
      className="admin-dialog rounded-2xl border bg-white p-6 text-slate-900 shadow-xl backdrop:bg-slate-950/50"
    >
      <header className="mb-5 flex items-start justify-between gap-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <button
          autoFocus
          type="button"
          className="rounded-lg border px-3 py-2"
          onClick={onClose}
        >
          Close
        </button>
      </header>
      {children}
    </dialog>
  );
}
