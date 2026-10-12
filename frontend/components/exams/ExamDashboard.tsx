'use client';

import { AdminWorkspace } from './AdminWorkspace';
import Link from 'next/link';
import { useAdminRouter } from './AdminNavigation';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { examsApi, type ExamListItem } from '@/lib/api/exams';
import { useMetadataIndex } from '@/providers/MetadataIndexProvider';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { examJsonTemplateText, parseExamInputJson } from './examJsonTemplate';

function statusStyle(status: string): string {
  if (status === 'published')
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  if (status === 'closed') return 'bg-slate-100 text-slate-600 ring-slate-200';
  return 'bg-amber-50 text-amber-700 ring-amber-200';
}

export function ExamDashboard() {
  const router = useAdminRouter();
  const orgSession = useOrgSession();
  const metadata = useMetadataIndex();
  const orgId = orgSession.activeOrgId;
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [view, setView] = useState('list');
  const [preferencesReady, setPreferencesReady] = useState(false);
  useEffect(() => {
    if (!orgId) return;
    try {
      const p = JSON.parse(
        sessionStorage.getItem(`exam-library:${orgId}`) || '{}',
      );
      setSearch(p.search || '');
      setStatus(p.status || 'all');
      setView(p.view || 'list');
    } catch {}
    setPreferencesReady(true);
  }, [orgId]);
  useEffect(() => {
    if (orgId && preferencesReady)
      try {
        sessionStorage.setItem(
          `exam-library:${orgId}`,
          JSON.stringify({ search, status, view }),
        );
      } catch {}
  }, [search, status, view, orgId, preferencesReady]);
  const [showJson, setShowJson] = useState(false);
  const [jsonText, setJsonText] = useState(examJsonTemplateText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archivedExams, setArchivedExams] = useState<ExamListItem[]>([]);

  const exams = metadata.index.exams;
  const sourceExams = showArchived ? archivedExams : exams;
  const visibleExams = sourceExams.filter(
    (e) =>
      (status === 'all' || e.status === status) &&
      [e.title, e.publicId, e.description].some((v) =>
        v?.toLowerCase().includes(search.toLowerCase()),
      ),
  );

  useEffect(() => {
    if (!showArchived || !orgId) return;
    void examsApi
      .list(orgId, true)
      .then(setArchivedExams)
      .catch(() => setError('Could not load archived exams.'));
  }, [orgId, showArchived]);

  const duplicateExam = async (examId: string) => {
    if (!orgId) return;
    setBusy(true);
    try {
      const created = await examsApi.duplicate(orgId, examId);
      await metadata.refreshKey('exams');
      router.push(`/orgs/${orgId}/exams/${created.id}`);
    } catch (caught) {
      console.error('Failed to duplicate exam', caught);
      setError('Could not duplicate the exam.');
    } finally {
      setBusy(false);
    }
  };

  const toggleArchive = async (examId: string, restore: boolean) => {
    if (!orgId) return;
    setBusy(true);
    try {
      if (restore) await examsApi.restore(orgId, examId);
      else await examsApi.archive(orgId, examId);
      await metadata.refreshKey('exams');
      if (showArchived) setArchivedExams(await examsApi.list(orgId, true));
    } catch (caught) {
      console.error('Failed to update archive state', caught);
      setError('Could not update the exam archive.');
    } finally {
      setBusy(false);
    }
  };

  const createBlank = async () => {
    if (!orgId) return;
    setBusy(true);
    setError(null);
    try {
      const exam = await examsApi.create(orgId, {
        title: 'Untitled exam',
        description: 'Add instructions for respondents.',
        questions: [
          {
            type: 'single_choice',
            prompt: 'Untitled question',
            graded: false,
            points: 1,
            options: [
              { key: 'a', label: 'Option 1' },
              { key: 'b', label: 'Option 2' },
            ],
            correctAnswers: [],
          },
        ],
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
    <AdminWorkspace dirty={showJson && jsonText !== examJsonTemplateText}>
      <div className="min-h-full bg-slate-50 px-4 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-col gap-5 border-b border-slate-200 pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                {showArchived ? 'Archived exams' : 'Exams'}
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Create, share, and manage your assessments.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={createBlank}
                disabled={busy || !orgId}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {busy ? 'Working…' : 'New exam'}
              </button>
              <button
                type="button"
                onClick={() => setShowArchived((value) => !value)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {showArchived ? 'Active exams' : 'Archived exams'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                onChange={loadFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Upload JSON
              </button>
              <button
                type="button"
                onClick={() => setShowJson((current) => !current)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Paste JSON
              </button>
            </div>
          </header>

          <div className="admin-library-stats">
            <span>
              <b>{exams.length}</b> Active exams
            </span>
            <span>
              <b>{exams.filter((e) => e.status === 'published').length}</b>{' '}
              Published
            </span>
            <span>
              <b>{exams.filter((e) => e.status === 'draft').length}</b> Drafts
            </span>
          </div>
          <div className="admin-library-filters">
            <label>
              Search exams
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Title, instructions, or public ID"
              />
            </label>
            <label>
              Status
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
              </select>
            </label>
            <button
              type="button"
              aria-pressed={view === 'list'}
              onClick={() => setView(view === 'list' ? 'cards' : 'list')}
            >
              {view === 'list' ? 'Card view' : 'List view'}
            </button>
            {(search || status !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatus('all');
                }}
              >
                Clear filters
              </button>
            )}
          </div>
          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {showJson && (
            <section className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3 text-sm text-slate-300">
                <span>Exam JSON representation</span>
                <button
                  type="button"
                  onClick={importJson}
                  disabled={busy}
                  className="rounded-lg bg-blue-500 px-3 py-1.5 font-semibold text-white hover:bg-blue-400 disabled:opacity-50"
                >
                  Import as exam
                </button>
              </div>
              <textarea
                value={jsonText}
                onChange={(event) => setJsonText(event.target.value)}
                spellCheck={false}
                className="h-96 w-full resize-y bg-slate-950 p-5 font-mono text-sm leading-6 text-slate-100 outline-none"
              />
            </section>
          )}

          {metadata.status === 'loading' && (
            <p role="status" className="mt-6">
              Loading exams…
            </p>
          )}
          <section
            className={`admin-exam-library mt-6 grid gap-4 ${view === 'cards' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'admin-list-view'}`}
          >
            {visibleExams.map((exam) => (
              <article
                key={exam.id}
                className="admin-exam-card group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1 ${statusStyle(exam.status)}`}
                  >
                    {exam.status}
                  </span>
                  <span className="text-xs text-slate-500">
                    {exam.attemptCount} attempt
                    {exam.attemptCount === 1 ? '' : 's'}
                  </span>
                </div>
                <h2 className="mt-5 line-clamp-2 text-lg font-semibold text-slate-950">
                  {exam.title}
                </h2>
                <p className="mt-2 line-clamp-2 min-h-10 text-sm text-slate-600">
                  {exam.description || 'No instructions yet.'}
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span className="rounded-md bg-slate-100 px-2 py-1">
                    {exam.durationMinutes} min
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-1">
                    {exam.maxAttempts === 0
                      ? 'Unlimited attempts'
                      : `${exam.maxAttempts} attempts`}
                  </span>
                  {exam.preventFocusLoss && (
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">
                      Focus lock
                    </span>
                  )}
                </div>
                <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4">
                  {!showArchived && (
                    <Link
                      href={`/orgs/${orgId}/exams/${exam.id}`}
                      className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Edit
                    </Link>
                  )}
                  {!showArchived && (
                    <Link
                      href={`/orgs/${orgId}/exams/${exam.id}/reports`}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Report
                    </Link>
                  )}
                  {!showArchived ? (
                    <details className="admin-overflow">
                      <summary aria-label={`More actions for ${exam.title}`}>
                        More
                      </summary>
                      <div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void duplicateExam(exam.id)}
                        >
                          Duplicate
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void toggleArchive(exam.id, false)}
                        >
                          Archive
                        </button>
                      </div>
                    </details>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void toggleArchive(exam.id, true)}
                      className="rounded-lg border px-3 py-2"
                    >
                      Restore
                    </button>
                  )}
                </div>
              </article>
            ))}
          </section>

          {visibleExams.length === 0 &&
            !showJson &&
            metadata.status !== 'loading' && (
              <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <h2 className="text-lg font-semibold text-slate-900">
                  {sourceExams.length
                    ? 'No matching exams'
                    : showArchived
                      ? 'No archived exams'
                      : 'Create your first exam'}
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                  {sourceExams.length
                    ? 'Try another search or clear the filters.'
                    : showArchived
                      ? 'Archived exams remain preserved and can be restored at any time.'
                      : 'Start visually or paste the complete JSON representation for a quick push.'}
                </p>
                {!showArchived && (
                  <button
                    type="button"
                    onClick={createBlank}
                    className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Create exam
                  </button>
                )}
              </div>
            )}
        </div>
      </div>
    </AdminWorkspace>
  );
}
