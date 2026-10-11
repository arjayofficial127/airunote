'use client';
import { useState } from 'react';
import { examsApi } from '@/lib/api/exams';
import { apiError } from '@/lib/api/appearance';
export function PreviewCodeControl({ orgId, examId }: { orgId: string; examId: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ code: string | null; path: string }>();
  const [message, setMessage] = useState('');
  async function configure(enabled: boolean) {
    setBusy(true); setMessage('');
    try { setResult(await examsApi.previewCode(orgId, examId, enabled)); if (!enabled) setMessage('Code access disabled.'); }
    catch (error) { setMessage(apiError(error)); }
    finally { setBusy(false); }
  }
  return <><button onClick={() => setOpen(true)} className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-800">Public preview code</button>{open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-5"><section role="dialog" aria-modal="true" aria-label="Public preview code" className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6"><h2 className="text-xl font-semibold">Public preview code</h2><p className="text-sm text-slate-600">Share the link and code with reviewers. Previews are graded and follow exam rules, with unlimited attempts. Results appear in PreviewAttempts. Generating a new code replaces the previous code.</p>{result?.code && <div className="space-y-3"><p className="rounded-lg bg-violet-50 p-3 text-center font-mono text-3xl tracking-widest">{result.code}</p><a className="block break-all text-sm text-blue-700 underline" href={result.path} target="_blank" rel="noreferrer">{typeof window !== 'undefined' ? window.location.origin : ''}{result.path}</a><p className="text-xs text-slate-500">Copy this code now; only its hash is stored.</p></div>}{message && <p role="status" className="text-sm">{message}</p>}<div className="flex flex-wrap gap-2"><button disabled={busy} onClick={() => void configure(true)} className="rounded-lg bg-violet-800 px-4 py-2 text-white disabled:opacity-50">Generate code</button><button disabled={busy} onClick={() => void configure(false)} className="rounded-lg border px-4 py-2 disabled:opacity-50">Disable code</button><button onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2">Close</button></div></section></div>}</>;
}
