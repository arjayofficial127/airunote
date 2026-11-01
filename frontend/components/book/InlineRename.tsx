'use client';

import { useEffect, useId, useRef, useState } from 'react';

export function InlineRename({ name, label, onSave, onClose, setDraftFlag, error }: {
  name: string;
  label: string;
  onSave: (name: string) => Promise<boolean>;
  onClose: () => void;
  setDraftFlag: (key: string, value: boolean) => void;
  error?: string | null;
}) {
  const [draft, setDraft] = useState(name);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const id = useId();

  useEffect(() => { input.current?.focus(); input.current?.select(); }, []);
  useEffect(() => {
    setDraftFlag(id, draft.trim() !== name);
    return () => setDraftFlag(id, false);
  }, [draft, name, id, setDraftFlag]);

  async function save() {
    const value = draft.trim();
    if (!value || pending.current) return;
    if (value === name) { onClose(); return; }
    pending.current = true; setBusy(true); setFailed(false);
    try { if (await onSave(value)) onClose(); else setFailed(true); }
    catch { setFailed(true); }
    finally { pending.current = false; setBusy(false); }
  }

  return <form className="ab-inline-rename" aria-label={`Rename ${name}`} aria-busy={busy}
    onSubmit={event => { event.preventDefault(); void save(); }}
    onKeyDown={event => {
      if (event.nativeEvent.isComposing) { if (event.key === 'Enter') event.preventDefault(); return; }
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); if (!pending.current) onClose(); }
    }}>
    <input ref={input} aria-label={label} title="Enter to save. Escape to cancel." required maxLength={255} value={draft} disabled={busy}
      aria-describedby={failed ? id : undefined} onChange={event => { setDraft(event.target.value); setFailed(false); }} />
    <button type="submit" aria-label="Save name" title="Save name (Enter)" disabled={busy || !draft.trim()}>✓</button>
    <button type="button" aria-label="Cancel rename" title="Cancel rename (Escape)" disabled={busy} onClick={onClose}>×</button>
    {failed && <span id={id} className="ab-inline-rename-error" role="alert">{error || 'Could not save this name. Try again.'}</span>}
  </form>;
}
