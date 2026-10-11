'use client';
import { useState, type FormEvent } from 'react';
import { publicExamsApi } from '@/lib/api/exams';
import { apiError } from '@/lib/api/appearance';
import { PublicExamPage } from './PublicExamPage';

export function CodedExamPreview({ publicId }: { publicId: string }) {
  const [code, setCode] = useState('');
  const [grant, setGrant] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function unlock(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { setGrant((await publicExamsApi.unlockPreview(publicId, code)).grant); }
    catch (reason) { setError(apiError(reason)); }
    finally { setBusy(false); }
  }
  if (grant) return <><div className="bg-violet-50 p-3 text-center text-sm text-violet-900">Preview Coded · Graded · All exam rules apply · Unlimited attempts</div><PublicExamPage publicId={publicId} codedGrant={grant} /></>;
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><form onSubmit={unlock} className="w-full max-w-sm space-y-5 rounded-2xl border bg-white p-8 shadow-sm"><h1 className="text-2xl font-semibold">Preview access</h1><p className="text-sm text-slate-600">Enter the eight-digit code shared by your exam administrator. Your preview answers and grade will be recorded separately.</p><label className="block text-sm font-medium">Preview code<input autoFocus autoComplete="off" inputMode="numeric" pattern="[0-9]{8}" maxLength={8} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} className="mt-2 w-full rounded-lg border p-3 text-center font-mono text-2xl tracking-widest" /></label>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy || code.length !== 8 || !publicId} className="w-full rounded-lg bg-emerald-900 p-3 font-semibold text-white disabled:opacity-50">{busy ? 'Checking…' : 'Open preview'}</button></form></main>;
}
