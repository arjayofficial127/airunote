'use client';

import { useState } from 'react';
import { creatorAppearance } from '@/lib/exam-appearance';
import { AppearanceFields } from './AppearanceFields';
import { AppearancePreview } from './AppearancePreview';

export function LocalAppearanceWorkspace() {
  const [config, setConfig] = useState({ ...creatorAppearance, headerLabel: 'PARTNER KNOWLEDGE CHECK EXAM' });
  const [title, setTitle] = useState('386 - FY27 HOLIDAY PROMOTION');
  const [description, setDescription] = useState('WRAPPED IN JOY\n\nINSTRUCTIONS:\nThis is a Partner Knowledge Check Exam designed to assess your knowledge of the FY27 Holiday Promotion. Please read each question carefully and select the letter of the correct answer.\n\nEnter your full name and Partner Number in the identity fields.');
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
    <header className="mb-6"><h1 className="text-xl font-semibold">Local appearance workspace</h1><p className="mt-1 text-sm text-slate-500">Changes appear immediately in the preview. This local draft is reset on refresh.</p></header>
    <div className="grid min-w-0 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="min-w-0 space-y-6">
        <section className="space-y-3 rounded-2xl border bg-white p-5">
          <label className="block text-sm">Exam title<input className="mt-1 w-full rounded-lg border p-2" value={title} onChange={e => setTitle(e.target.value)} /></label>
          <label className="block text-sm">Instructions<textarea className="mt-1 w-full rounded-lg border p-2" rows={8} value={description} onChange={e => setDescription(e.target.value)} /></label>
        </section>
        <AppearanceFields value={config} onChange={setConfig} />
      </div>
      <AppearancePreview config={config} title={title} description={description} orgId="" />
    </div>
  </main>;
}
