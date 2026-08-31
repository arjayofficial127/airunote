'use client';

import type { ExamInput, ExamReviewMode, ExamStatus } from '@/lib/api/exams';

interface ExamSettingsEditorProps {
  value: ExamInput;
  onChange: (value: ExamInput) => void;
}

export function ExamSettingsEditor({ value, onChange }: ExamSettingsEditorProps) {
  const update = <K extends keyof ExamInput>(key: K, fieldValue: ExamInput[K]) => onChange({ ...value, [key]: fieldValue });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Exam details</h2>
        <div className="mt-5 space-y-5">
          <label className="block text-sm font-medium text-slate-700">
            Title
            <input value={value.title} onChange={(event) => update('title', event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Public exam ID
            <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
              <span className="border-r border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">/exam/</span>
              <input
                value={value.publicId ?? ''}
                maxLength={80}
                spellCheck={false}
                onChange={(event) => update('publicId', event.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                className="min-w-0 flex-1 px-4 py-3 font-mono text-sm text-slate-900 outline-none"
                placeholder="fy2026-autumn-knowledge-check"
              />
            </div>
            <span className="mt-2 block text-xs leading-5 text-slate-500">Use 3–80 lowercase letters, numbers, and hyphens. Changing this value replaces the old public link.</span>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Instructions
            <textarea value={value.description ?? ''} onChange={(event) => update('description', event.target.value)} rows={6} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 leading-6 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">Duration (minutes)<input type="number" min={1} max={1440} value={value.durationMinutes ?? 20} onChange={(event) => update('durationMinutes', Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
            <label className="text-sm font-medium text-slate-700">Maximum takes<input type="number" min={1} max={100} value={value.maxAttempts ?? 3} onChange={(event) => update('maxAttempts', Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5" /></label>
            <label className="text-sm font-medium text-slate-700">Status<select value={value.status ?? 'draft'} onChange={(event) => update('status', event.target.value as ExamStatus)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="draft">Draft</option><option value="published">Published</option><option value="closed">Closed</option></select></label>
          </div>
          <label className="block text-sm font-medium text-slate-700">After submission<select value={value.reviewMode ?? 'respondent_answers'} onChange={(event) => update('reviewMode', event.target.value as ExamReviewMode)} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5"><option value="respondent_answers">Show their answers, hide correct answers</option><option value="with_correct_answers">Show answers and correct answers</option><option value="none">Show completion only</option></select></label>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Answering controls</h2>
          <div className="mt-4 space-y-4">
            {[
              ['oneQuestionAtATime', 'One question at a time', 'Reduce distraction and prevent looking ahead.'],
              ['preventFocusLoss', 'Focus lock', 'Leaving the tab ends the attempt and requires an admin continue link.'],
              ['shuffleQuestions', 'Jumble questions', 'Pinned sections and questions stay in place.'],
              ['shuffleOptions', 'Jumble choices', 'Each attempt receives its own option order.'],
            ].map(([key, label, description]) => (
              <label key={key} className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={Boolean(value[key as keyof ExamInput])} onChange={(event) => update(key as keyof ExamInput, event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600" />
                <span><span className="block text-sm font-medium text-slate-800">{label}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span></span>
              </label>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-950">Respondent identity</h2>
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-3 text-sm text-slate-700"><input type="checkbox" checked={value.requireEmail ?? false} onChange={(event) => update('requireEmail', event.target.checked)} className="h-4 w-4 rounded" />Require email</label>
            <label className="flex items-center gap-3 text-sm text-slate-700"><input type="checkbox" checked={value.requireIdentifier ?? false} onChange={(event) => update('requireIdentifier', event.target.checked)} className="h-4 w-4 rounded" />Require student/employee ID</label>
            <p className="text-xs leading-5 text-slate-500">Device, IP, and browser signals are hashed and retained for attempt review.</p>
          </div>
        </section>
      </aside>
    </div>
  );
}
