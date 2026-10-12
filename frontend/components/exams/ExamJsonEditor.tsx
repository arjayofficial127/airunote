'use client';
import { useEffect, useRef, useState } from 'react';
import type { ExamInput } from '@/lib/api/exams';
import { parseExamInputJson } from './examJsonTemplate';
export function ExamJsonEditor({
  value,
  locked,
  onChange,
  onDirtyChange,
}: {
  value: ExamInput;
  locked: boolean;
  onChange: (value: ExamInput) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [base, setBase] = useState(() => JSON.stringify(value, null, 2));
  const [message, setMessage] = useState<string | null>(null);
  const dirty = text !== base;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    const next = JSON.stringify(value, null, 2);
    if (!dirtyRef.current) {
      setText(next);
      setBase(next);
    } else
      setMessage(
        'Visual settings changed. Pending JSON is preserved; apply it to replace the draft or reload from the current draft.',
      );
  }, [value]);
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  const reload = () => {
    const next = JSON.stringify(value, null, 2);
    setText(next);
    setBase(next);
    setMessage('JSON reloaded from the current exam draft.');
  };
  const apply = () => {
    try {
      const next = parseExamInputJson(text);
      const canonical = JSON.stringify(next, null, 2);
      setText(canonical);
      setBase(canonical);
      dirtyRef.current = false;
      onChange(next);
      setMessage('JSON applied to the draft. Save exam to persist it.');
    } catch (error) {
      setMessage(
        `JSON was not applied. Your text is preserved. ${error instanceof Error ? error.message : 'Check required fields and structure.'}`,
      );
    }
  };
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([text], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'exam-draft.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5 text-slate-300">
        <div>
          <h2 className="font-semibold text-white">JSON pro</h2>
          <p className="text-xs">
            {dirty ? 'Pending JSON edits · not applied' : 'Current exam draft'}{' '}
            · Apply, then Save exam
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={download}
            className="rounded-lg border px-3 py-2"
          >
            Download JSON
          </button>
          <button
            type="button"
            onClick={reload}
            className="rounded-lg border px-3 py-2"
          >
            Reload from draft
          </button>
          <button
            type="button"
            disabled={locked || !dirty}
            onClick={apply}
            className="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
          >
            Apply to draft
          </button>
        </div>
      </header>
      {locked && (
        <p className="bg-amber-950/50 p-4 text-sm text-amber-200">
          Structural JSON editing is locked after attempts exist. Use Questions
          to edit grading, or duplicate the exam.
        </p>
      )}
      <textarea
        aria-label="Exam JSON"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={locked}
        spellCheck={false}
        className="h-[620px] w-full resize-y bg-slate-950 p-5 font-mono text-sm leading-6 text-slate-100 outline-none disabled:opacity-70"
      />
      {message && (
        <p
          role="status"
          className="whitespace-pre-wrap border-t border-slate-800 p-5 text-sm text-slate-200"
        >
          {message}
        </p>
      )}
    </section>
  );
}
