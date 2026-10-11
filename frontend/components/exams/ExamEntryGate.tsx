'use client';
import { useState, type ReactNode } from 'react';
import { publicExamsApi } from '@/lib/api/exams';
import { apiError } from '@/lib/api/appearance';

export function ExamEntryGate({ publicId, required, grant, onGrant, children }: { publicId: string; required: boolean; grant: string; onGrant: (grant: string) => void; children: ReactNode }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!required) return <>{children}</>;
  if (grant) return <><div className="px-7 pt-5 text-sm"><button type="button" className="underline" onClick={() => { onGrant(''); setCode(''); }}>Enter a different examiner code</button></div>{children}</>;
  return <form className="mx-auto max-w-md space-y-5 px-7 py-10" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await publicExamsApi.unlockEntry(publicId, code); onGrant(result.grant); setCode(''); }
    catch (e) { setError(apiError(e)); }
    finally { setBusy(false); }
  }}>
    <h2 className="text-2xl font-bold">Examiner code</h2>
    <p className="text-sm leading-6">Ask your on-site examiner to enter the 8-digit code to continue. Your timer has not started.</p>
    <label className="block text-sm font-semibold">8-digit code
      <input autoComplete="off" type="password" inputMode="numeric" pattern="[0-9]{8}" minLength={8} maxLength={8} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} className="mt-2 w-full rounded-xl border border-[var(--exam-color-d9bea0)] bg-white px-4 py-3 text-lg tracking-widest text-slate-950" />
    </label>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="w-full rounded-xl bg-[var(--exam-color-b95f2a)] px-5 py-3 font-bold text-[var(--exam-primary-text)] disabled:opacity-50">{busy ? 'Checking…' : 'Continue'}</button>
  </form>;
}
