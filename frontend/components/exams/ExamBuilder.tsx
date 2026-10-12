'use client';
import { PreviewCodeControl } from './PreviewCodeControl';

import { AdminWorkspace } from './AdminWorkspace';
import { AdminDialog } from './AdminDialog';
import axios from 'axios';
import Link from 'next/link';
import { useAdminRouter } from './AdminNavigation';
import { LeaveExamDialog } from './LeaveExamDialog';
import { useCallback, useEffect, useRef, useState } from 'react';
import { examsApi, type ExamDefinition, type ExamInput } from '@/lib/api/exams';
import { useHydratedContent } from '@/providers/HydratedContentProvider';
import { useMetadataIndex } from '@/providers/MetadataIndexProvider';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { ExamAppearanceEditor } from './ExamAppearanceEditor';
import { ExamJsonEditor } from './ExamJsonEditor';
import { ExamQuestionsEditor } from './ExamQuestionsEditor';
import { ExamSettingsEditor } from './ExamSettingsEditor';
import {
  normalizeStructure,
  sectionIssues,
} from '../../../backend-node/src/modules/exams/section-structure';
import { examDefinitionToInput } from './examDefinitionInput';

interface ExamBuilderProps {
  examId: string;
}

type BuilderTab =
  | 'setup'
  | 'questions'
  | 'json'
  | 'appearance'
  | 'preview'
  | 'share';

export function ExamBuilder({ examId }: ExamBuilderProps) {
  const router = useAdminRouter();
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const orgSession = useOrgSession();
  const {
    getHydrated,
    hydrate,
    refreshEntity,
    error: hydrationError,
  } = useHydratedContent();
  const metadata = useMetadataIndex();
  const [draft, setDraft] = useState<ExamInput | null>(null);
  const [savedDraft, setSavedDraft] = useState('');
  const dirtyRef = useRef(false);
  const leaveDirtyRef = useRef(false);
  const [appearanceState, setAppearanceState] = useState({
    dirty: false,
    busy: false,
    ready: false,
  });
  const appearanceSave = useRef<(() => Promise<void>) | null>(null);
  const onAppearanceState = useCallback(
    (state: {
      dirty: boolean;
      busy: boolean;
      ready: boolean;
      save: () => Promise<void>;
    }) => {
      appearanceSave.current = state.save;
      setAppearanceState((previous) =>
        previous.dirty === state.dirty &&
        previous.busy === state.busy &&
        previous.ready === state.ready
          ? previous
          : { dirty: state.dirty, busy: state.busy, ready: state.ready },
      );
    },
    [],
  );
  const [jsonDirty, setJsonDirty] = useState(false);
  const [review, setReview] = useState(false);
  const [copyFallback, setCopyFallback] = useState('');
  const [tab, setTab] = useState<BuilderTab>('setup');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const orgId = orgSession.activeOrgId;
  const exam = getHydrated<ExamDefinition>('exam', examId);

  useEffect(() => {
    void hydrate('exam', examId);
  }, [examId, hydrate]);

  useEffect(() => {
    if (exam && !dirtyRef.current) {
      const input = examDefinitionToInput(exam);
      const next = {
        ...input,
        ...normalizeStructure(input.sections ?? [], input.questions ?? []),
      };
      setDraft(next);
      setSavedDraft(JSON.stringify(next));
    }
  }, [exam]);

  const dirty = !!draft && JSON.stringify(draft) !== savedDraft;
  dirtyRef.current = dirty;
  leaveDirtyRef.current = dirty || appearanceState.dirty || jsonDirty;
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (leaveDirtyRef.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    const beforeNavigate = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest('a[href]');
      if (
        leaveDirtyRef.current &&
        link &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey &&
        (link as HTMLAnchorElement).target !== '_blank'
      ) {
        event.preventDefault();
        event.stopPropagation();
        setLeaveHref((link as HTMLAnchorElement).href);
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    document.addEventListener('click', beforeNavigate, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      document.removeEventListener('click', beforeNavigate, true);
    };
  }, []);

  const save = async () => {
    if (!orgId || !draft || !exam) return;
    const issues = sectionIssues(draft);
    if (issues.length) {
      setMessage(issues.join(' '));
      return;
    }
    if (
      !draft.title.trim() ||
      !Number.isFinite(draft.durationMinutes ?? 20) ||
      (draft.durationMinutes ?? 20) < 1 ||
      (draft.durationMinutes ?? 20) > 1440 ||
      !Number.isInteger(draft.maxAttempts ?? 3) ||
      (draft.maxAttempts ?? 3) < 0 ||
      (draft.maxAttempts ?? 3) > 100 ||
      (draft.startsAt &&
        draft.endsAt &&
        new Date(draft.endsAt) <= new Date(draft.startsAt))
    ) {
      setMessage(
        'Check the title, duration, attempt limit, and response window. Your draft is preserved.',
      );
      return;
    }
    if (jsonDirty) {
      setMessage(
        'Apply or discard your pending JSON edits before saving the exam.',
      );
      setTab('json');
      return;
    }
    let settingsPersisted = false;
    setSaving(true);
    setMessage(null);
    try {
      if (exam.attemptCount === 0) {
        const saved = await examsApi.replaceDefinition(orgId, examId, draft);
        const input = examDefinitionToInput(saved);
        const next = {
          ...input,
          ...normalizeStructure(input.sections ?? [], input.questions ?? []),
        };
        setDraft(next);
        setSavedDraft(JSON.stringify(next));
        dirtyRef.current = false;
      } else {
        await examsApi.update(orgId, examId, {
          title: draft.title,
          publicId: draft.publicId,
          description: draft.description,
          status: draft.status,
          durationMinutes: draft.durationMinutes,
          oneQuestionAtATime: draft.oneQuestionAtATime,
          preventFocusLoss: draft.preventFocusLoss,
          maxAttempts: draft.maxAttempts,
          reviewMode: draft.reviewMode,
          shuffleQuestions: draft.shuffleQuestions,
          shuffleOptions: draft.shuffleOptions,
          requireEmail: draft.requireEmail,
          requireIdentifier: draft.requireIdentifier,
          startsAt: draft.startsAt,
          endsAt: draft.endsAt,
        });
        settingsPersisted = true;
        const gradingResults = await Promise.allSettled(
          (draft.questions ?? []).flatMap((question) =>
            question.id
              ? [
                  examsApi.updateQuestionGrading(orgId, examId, question.id, {
                    graded: question.graded ?? true,
                    points: question.points ?? 1,
                    correctAnswers: question.correctAnswers ?? [],
                    explanation: question.explanation ?? null,
                  }),
                ]
              : [],
          ),
        );
        const rejected = gradingResults.find(
          (result) => result.status === 'rejected',
        );
        if (rejected?.status === 'rejected') throw rejected.reason;
      }
      if (exam.attemptCount > 0) {
        setSavedDraft(JSON.stringify(draft));
        dirtyRef.current = false;
      }
      await Promise.all([
        refreshEntity('exam', examId),
        metadata.refreshKey('exams'),
      ]);
      setMessage('Exam saved. Reports use the latest grading rules.');
    } catch (error) {
      console.error('Failed to save exam', error);
      const apiError = axios.isAxiosError<{ error?: { message?: string } }>(
        error,
      )
        ? error.response?.data?.error?.message
        : null;
      setMessage(
        (settingsPersisted
          ? 'Some settings may have saved, but grading updates did not all complete. Your draft is preserved; retry to finish. '
          : 'Your draft is preserved. ') +
          (apiError ||
            'Could not save the exam. Check required fields and correct answers.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const copyPublicLink = async () => {
    if (!exam) return;
    const link = `${window.location.origin}/exam/${exam.publicId}`;
    try {
      await navigator.clipboard.writeText(link);
      setMessage('Saved public exam link copied.');
    } catch {
      setCopyFallback(link);
      setMessage(
        'Clipboard unavailable. Select and copy the saved public link below.',
      );
    }
  };

  if (!exam || !draft) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
        {hydrationError || 'Loading exam editor…'}
        {hydrationError && (
          <button
            type="button"
            className="ml-3 rounded-lg border px-4 py-2"
            onClick={() => void hydrate('exam', examId)}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  const locked = exam.attemptCount > 0;
  const tabs: Array<{ id: BuilderTab; label: string }> = [
    { id: 'setup', label: 'Setup' },
    {
      id: 'questions',
      label: `Questions (${draft.questions?.filter((q) => !q.entryField).length ?? 0})`,
    },
    { id: 'appearance', label: 'Appearance' },
    { id: 'preview', label: 'Preview' },
    { id: 'share', label: 'Share & access' },
    { id: 'json', label: 'JSON pro' },
  ];

  return (
    <AdminWorkspace>
      <div
        data-appearance={tab === 'appearance' || tab === 'preview'}
        className="exam-editor min-w-0 min-h-full bg-slate-50 px-4 py-6 sm:px-6 lg:px-8"
      >
        {leaveHref && (
          <LeaveExamDialog
            onCancel={() => setLeaveHref(null)}
            onLeave={() => {
              dirtyRef.current = false;
              leaveDirtyRef.current = false;
              router.push(leaveHref);
              setLeaveHref(null);
            }}
          />
        )}
        <div className="exam-editor-container mx-auto min-w-0 max-w-7xl">
          <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <Link
                href={`/orgs/${orgId}/exams`}
                className="text-sm font-medium text-blue-700 hover:text-blue-800"
              >
                ← All exams
              </Link>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <h1 className="[overflow-wrap:anywhere] text-2xl font-semibold text-slate-950 sm:text-3xl">
                  {draft.title}
                </h1>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                  {exam.status}
                  {draft.status !== exam.status
                    ? ` · draft: ${draft.status}`
                    : ''}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                {exam.attemptCount} saved attempt
                {exam.attemptCount === 1 ? '' : 's'} · Exam:{' '}
                {saving ? 'Saving…' : dirty ? 'Unsaved' : 'Saved'} · Appearance:{' '}
                {!appearanceState.ready
                  ? 'Loading / unavailable'
                  : appearanceState.busy
                    ? 'Saving…'
                    : appearanceState.dirty
                      ? 'Unsaved'
                      : 'Saved'}
                {jsonDirty ? ' · JSON: Not applied' : ''}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTab('preview')}
                className="rounded-xl border bg-white px-4 py-3"
              >
                Visual preview
              </button>
              <button
                type="button"
                onClick={() => setReview(true)}
                className="rounded-xl border bg-white px-4 py-3"
              >
                Review changes
              </button>
              {tab === 'appearance' ? (
                <button
                  type="button"
                  disabled={
                    !appearanceState.ready ||
                    appearanceState.busy ||
                    !appearanceState.dirty
                  }
                  onClick={() => void appearanceSave.current?.()}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
                >
                  {appearanceState.busy ? 'Saving…' : 'Save appearance'}
                </button>
              ) : (
                tab !== 'preview' &&
                tab !== 'share' && (
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving || !dirty}
                    className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save exam'}
                  </button>
                )
              )}
            </div>
          </header>

          {message && (
            <div
              role="status"
              className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800"
            >
              {message}
            </div>
          )}

          <nav
            className="admin-exam-tabs my-6 flex gap-1 border-b border-slate-200"
            aria-label="Exam editor"
          >
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={tab === item.id}
                onClick={() => setTab(item.id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === item.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {item.label}
              </button>
            ))}
            <Link
              href={`/orgs/${orgId}/exams/${examId}/reports`}
              className="rounded-lg px-4 py-2 text-sm font-medium"
            >
              Reports
            </Link>
          </nav>

          <div hidden={tab !== 'appearance' && tab !== 'preview'}>
            <ExamAppearanceEditor
              onStateChange={onAppearanceState}
              view={tab === 'preview' ? 'preview' : 'edit'}
              examId={examId}
              title={draft.title}
              description={draft.description}
              examDraft={draft}
            />
          </div>
          <section hidden={tab !== 'share'} className="admin-two-columns">
            <div className="admin-panel">
              <h2>Respondent access</h2>
              <p>
                The public link follows the saved publication status, schedule,
                identity requirements, and attempt limits.
              </p>
              <label>
                Saved public exam link
                <input
                  readOnly
                  className="w-full rounded-lg border p-3"
                  value={`${typeof window !== 'undefined' ? window.location.origin : ''}/exam/${exam.publicId}`}
                />
              </label>
              {draft.publicId !== exam.publicId && (
                <p className="admin-notice admin-warning">
                  The public ID has unsaved changes. Copy uses the current saved
                  link.
                </p>
              )}
              <button
                type="button"
                onClick={copyPublicLink}
                className="rounded-xl border px-4 py-3"
              >
                Copy public link
              </button>
              <a
                href={`/exam/${exam.publicId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded-xl border px-4 py-3"
              >
                Open public exam
              </a>
              <h3>On-site examiner access</h3>
              {orgId && (
                <PreviewCodeControl orgId={orgId} examId={examId} access />
              )}
            </div>
            <div className="admin-panel">
              <h2>Reviewer testing</h2>
              <p>
                Reviewer previews are graded test attempts with unlimited
                attempts. They are recorded separately in Preview attempts.
              </p>
              {orgId && <PreviewCodeControl orgId={orgId} examId={examId} />}
              <h3>Saved admin test</h3>
              <p>
                Tests the saved exam, creates a labeled test attempt, and opens
                in a new tab.
              </p>
              <a
                href={`/exam/admin-preview?org=${encodeURIComponent(orgId || '')}&exam=${encodeURIComponent(examId)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block rounded-xl border px-4 py-3"
              >
                Open saved admin test
              </a>
            </div>
          </section>
          {copyFallback && (
            <label className="admin-panel">
              Copy this saved link
              <input
                readOnly
                onFocus={(e) => e.target.select()}
                value={copyFallback}
                className="w-full rounded-lg border p-3"
              />
            </label>
          )}
          {review && (
            <AdminDialog
              title="Review unsaved changes"
              onClose={() => setReview(false)}
            >
              <p>
                Exam changes: {dirty ? 'Unsaved' : 'Saved'}. Appearance:{' '}
                {appearanceState.dirty
                  ? 'Unsaved — save separately in Appearance'
                  : 'Saved'}
                . JSON:{' '}
                {jsonDirty
                  ? 'Pending — apply before saving'
                  : 'Applied / unchanged'}
                .
              </p>
              <ul className="my-4 space-y-2">
                {Object.keys(draft)
                  .filter(
                    (key) =>
                      JSON.stringify(draft[key as keyof ExamInput]) !==
                      JSON.stringify(JSON.parse(savedDraft || '{}')[key]),
                  )
                  .map((key) => (
                    <li key={key}>
                      <b>{key.replace(/([A-Z])/g, ' $1')}</b> changed
                      {key === 'publicId'
                        ? ' — saving replaces the old public link'
                        : ''}
                      {!['questions', 'sections'].includes(key) && (
                        <span className="block text-sm">
                          Saved:{' '}
                          {String(
                            JSON.parse(savedDraft || '{}')[key] ?? 'Not set',
                          )}{' '}
                          → Draft:{' '}
                          {String(draft[key as keyof ExamInput] ?? 'Not set')}
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
              {locked && (
                <p className="admin-notice admin-warning">
                  Existing answers remain. Reports use the latest saved grading
                  rules.
                </p>
              )}
              <p>
                Exam and appearance saves are independent. Changing codes is
                immediate.
              </p>
            </AdminDialog>
          )}
          <fieldset disabled={saving} className="m-0 min-w-0 border-0 p-0">
            <div hidden={tab !== 'setup'}>
              <ExamSettingsEditor value={draft} onChange={setDraft} />
            </div>
            <div hidden={tab !== 'questions'}>
              <ExamQuestionsEditor
                questions={draft.questions ?? []}
                sections={draft.sections ?? []}
                locked={locked}
                revision={savedDraft}
                onChange={(structure) =>
                  setDraft((current) =>
                    current ? { ...current, ...structure } : current,
                  )
                }
              />
            </div>
            <div hidden={tab !== 'json'}>
              <ExamJsonEditor
                onDirtyChange={setJsonDirty}
                value={draft}
                locked={locked}
                onChange={(value) =>
                  setDraft({
                    ...value,
                    ...normalizeStructure(
                      value.sections ?? [],
                      value.questions ?? [],
                    ),
                  })
                }
              />
            </div>
          </fieldset>
          {tab !== 'preview' && tab !== 'share' && (
            <footer className="admin-save-dock">
              <div>
                <b>
                  {tab === 'appearance' ? 'Appearance draft' : 'Exam draft'}
                </b>
                <small>
                  {tab === 'appearance'
                    ? 'New attempts use the saved design; existing attempts keep theirs.'
                    : jsonDirty
                      ? 'JSON edits are pending. Apply them before saving.'
                      : 'Exam settings and grading save here. Appearance saves separately.'}
                </small>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border px-4 py-3"
                  onClick={() => setReview(true)}
                >
                  Review changes
                </button>
                {tab === 'appearance' ? (
                  <button
                    type="button"
                    disabled={
                      !appearanceState.ready ||
                      !appearanceState.dirty ||
                      appearanceState.busy
                    }
                    className="rounded-lg bg-blue-600 px-4 py-3 text-white disabled:opacity-50"
                    onClick={() => void appearanceSave.current?.()}
                  >
                    {appearanceState.busy ? 'Saving…' : 'Save appearance'}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!dirty || saving}
                    className="rounded-lg bg-blue-600 px-4 py-3 text-white disabled:opacity-50"
                    onClick={() => void save()}
                  >
                    {saving ? 'Saving…' : 'Save exam'}
                  </button>
                )}
              </div>
            </footer>
          )}
        </div>
      </div>
    </AdminWorkspace>
  );
}
