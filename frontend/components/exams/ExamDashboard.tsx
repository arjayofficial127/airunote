'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChangeEvent, useRef, useState } from 'react';
import { examsApi } from '@/lib/api/exams';
import { useMetadataIndex } from '@/providers/MetadataIndexProvider';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { examJsonTemplateText, parseExamInputJson } from './examJsonTemplate';

function statusStyle(status: string): string {
  if (status === 'published') return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (status === 'closed') return 'bg-slate-100 text-slate-600 ring-slate-200';
  return 'bg-amber-50 text-amber-700 ring-amber-200';
}

export function ExamDashboard() {
  const router = useRouter();
  const orgSession = useOrgSession();
  const metadata = useMetadataIndex();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState(examJsonTemplateText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const orgId = orgSession.activeOrgId;
  const exams = metadata.index.exams;

  const createBlank = async () => {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    try {
      const exam = await examsApi.create(orgId, {
        title: 'Untitled exam',
        description: 'Add instructions for respondents.',
        questions: [{
          type: 'single_choice',
          prompt: 'Untitled question',
          graded: false,
          points: 1,
          options: [{ key: 'a', label: 'Option 1' }, { key: 'b', label: 'Option 2' }],
          correctAnswers: [],
        }],
      });
      await metadata.refreshKey('exams');
      router.push(`/orgs/${orgId}/exams/${exam.id}`);
    } catch (caught) {
      console.error('Failed to create exam', caught);
      setError('Could not create the exam.');
    } finally {
      setBusy(false);
    }
  };

  const importJson = async () => {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    try {
      const input = parseExamInputJson(jsonText);
      const exam = await examsApi.importJson(orgId, input);
      await metadata.refreshKey('exams');
      router.push(`/orgs/${orgId}/exams/${exam.id}`);
    } catch (caught) {
      console.error('Failed to import exam JSON', caught);
      setError('Import failed. Check the JSON and required question fields.');
    } finally {
      setBusy(false);
    }
  };

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setJsonText(await file.text());
    setShowJson(true);
  };

  return (
    <div className="min-h-full bg-slate-50 px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Primary journey
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Graded exams</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Build, publish, monitor, and grade timed exams. Website creation stays out of the way.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={loadFile} className="hidden" />
            <button type="button" onClick={() => fileRef.current?.click()} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Upload JSON
            </button>
            <button type="button" onClick={() => setShowJson((current) => !current)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              JSON pro tab
            </button>
            <button type="button" onClick={createBlank} disabled={busy || !orgId} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">
              {busy ? 'Working…' : 'New exam'}
            </button>
          </div>
        </header>

        {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {showJson && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3 text-sm text-slate-300">
              <span>Exam JSON representation</span>
              <button type="button" onClick={importJson} disabled={busy} className="rounded-lg bg-blue-500 px-3 py-1.5 font-semibold text-white hover:bg-blue-400 disabled:opacity-50">Import as exam</button>
            </div>
            <textarea value={jsonText} onChange={(event) => setJsonText(event.target.value)} spellCheck={false} className="h-96 w-full resize-y bg-slate-950 p-5 font-mono text-sm leading-6 text-slate-100 outline-none" />
          </section>
        )}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {exams.map((exam) => (
            <article key={exam.id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ${statusStyle(exam.status)}`}>{exam.status}</span>
                <span className="text-xs text-slate-500">{exam.attemptCount} attempt{exam.attemptCount === 1 ? '' : 's'}</span>
              </div>
              <h2 className="mt-5 line-clamp-2 text-lg font-semibold text-slate-950">{exam.title}</h2>
              <p className="mt-2 line-clamp-2 min-h-10 text-sm text-slate-600">{exam.description || 'No instructions yet.'}</p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-md bg-slate-100 px-2 py-1">{exam.durationMinutes} min</span>
                <span className="rounded-md bg-slate-100 px-2 py-1">{exam.maxAttempts} takes</span>
                {exam.preventFocusLoss && <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">Focus lock</span>}
              </div>
              <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4">
                <Link href={`/orgs/${orgId}/exams/${exam.id}`} className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-slate-800">Edit</Link>
                <Link href={`/orgs/${orgId}/exams/${exam.id}/reports`} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Report</Link>
              </div>
            </article>
          ))}
        </section>

        {exams.length === 0 && !showJson && (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-slate-900">Create Armel&apos;s first exam</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">Start visually or paste the complete JSON representation for a quick push.</p>
            <button type="button" onClick={createBlank} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white">Create exam</button>
          </div>
        )}
      </div>
    </div>
  );
}
