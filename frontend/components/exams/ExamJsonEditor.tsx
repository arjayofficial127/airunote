'use client';

import { useEffect, useState } from 'react';
import type { ExamInput } from '@/lib/api/exams';
import { parseExamInputJson } from './examJsonTemplate';

interface ExamJsonEditorProps {
  value: ExamInput;
  locked: boolean;
  onChange: (value: ExamInput) => void;
}

export function ExamJsonEditor({ value, locked, onChange }: ExamJsonEditorProps) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => setText(JSON.stringify(value, null, 2)), [value]);

  const apply = () => {
    try {
      onChange(parseExamInputJson(text));
      setMessage('JSON applied. Use Save exam to persist it.');
    } catch (error) {
      console.error('Invalid exam JSON', error);
      setMessage('Invalid exam JSON. Check the highlighted structure and required fields.');
    }
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-3 text-sm text-slate-300">
        <div><span className="font-medium text-white">JSON pro editor</span><span className="ml-2 text-xs text-slate-400">Portable representation of this exam</span></div>
        <button type="button" onClick={apply} disabled={locked} className="rounded-lg bg-blue-500 px-3 py-1.5 font-semibold text-white disabled:opacity-40">Apply JSON</button>
      </div>
      {locked && <div className="border-b border-amber-800/50 bg-amber-950/50 px-5 py-3 text-sm text-amber-200">Structural JSON edits are locked after responses exist. Use the Questions tab to change grading.</div>}
      <textarea value={text} onChange={(event) => setText(event.target.value)} disabled={locked} spellCheck={false} className="h-[620px] w-full resize-y bg-slate-950 p-5 font-mono text-sm leading-6 text-slate-100 outline-none disabled:opacity-70" />
      {message && <div className="border-t border-slate-800 px-5 py-3 text-sm text-slate-300">{message}</div>}
    </section>
  );
}
