'use client';

import axios from 'axios';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { examsApi, type ExamDefinition, type ExamInput } from '@/lib/api/exams';
import { useHydratedContent } from '@/providers/HydratedContentProvider';
import { useMetadataIndex } from '@/providers/MetadataIndexProvider';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { ExamJsonEditor } from './ExamJsonEditor';
import { ExamQuestionsEditor } from './ExamQuestionsEditor';
import { ExamSettingsEditor } from './ExamSettingsEditor';
import { examDefinitionToInput } from './examDefinitionInput';

interface ExamBuilderProps {
  examId: string;
}

type BuilderTab = 'setup' | 'questions' | 'json';

export function ExamBuilder({ examId }: ExamBuilderProps) {
  const orgSession = useOrgSession();
  const { getHydrated, hydrate, refreshEntity } = useHydratedContent();
  const metadata = useMetadataIndex();
  const [draft, setDraft] = useState<ExamInput | null>(null);
  const [tab, setTab] = useState<BuilderTab>('setup');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const orgId = orgSession.activeOrgId;
  const exam = getHydrated<ExamDefinition>('exam', examId);

  useEffect(() => {
    void hydrate('exam', examId);
  }, [examId, hydrate]);

  useEffect(() => {
    if (exam) setDraft(examDefinitionToInput(exam));
  }, [exam]);

  const save = async () => {
    if (!orgId || !draft || !exam) return;
    setSaving(true);
    setMessage(null);
    try {
      if (exam.attemptCount === 0) {
        await examsApi.replaceDefinition(orgId, examId, draft);
      } else {
        await examsApi.update(orgId, examId, {
          title: draft.title, publicId: draft.publicId, description: draft.description, status: draft.status,
          durationMinutes: draft.durationMinutes, oneQuestionAtATime: draft.oneQuestionAtATime,
          preventFocusLoss: draft.preventFocusLoss, maxAttempts: draft.maxAttempts, reviewMode: draft.reviewMode,
          shuffleQuestions: draft.shuffleQuestions, shuffleOptions: draft.shuffleOptions,
          requireEmail: draft.requireEmail, requireIdentifier: draft.requireIdentifier,
          startsAt: draft.startsAt, endsAt: draft.endsAt,
        });
        await Promise.all((draft.questions ?? []).flatMap((question) => question.id ? [examsApi.updateQuestionGrading(orgId, examId, question.id, {
          graded: question.graded ?? true,
          points: question.points ?? 1,
          correctAnswers: question.correctAnswers ?? [],
          explanation: question.explanation ?? null,
        })] : []));
      }
      await Promise.all([refreshEntity('exam', examId), metadata.refreshKey('exams')]);
      setMessage('Exam saved. Reports use the latest grading rules.');
    } catch (error) {
      console.error('Failed to save exam', error);
      const apiError = axios.isAxiosError<{ error?: { message?: string } }>(error)
        ? error.response?.data?.error?.message
        : null;
      setMessage(apiError || 'Could not save the exam. Check required fields and correct answers.');
    } finally {
      setSaving(false);
    }
  };

  const copyPublicLink = async () => {
    if (!exam) return;
    await navigator.clipboard.writeText(`${window.location.origin}/exam/${exam.publicId}`);
    setMessage('Public exam link copied.');
  };

  if (!exam || !draft) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Loading exam editor…</div>;
  }

  const locked = exam.attemptCount > 0;
  const tabs: Array<{ id: BuilderTab; label: string }> = [
    { id: 'setup', label: 'Setup' },
    { id: 'questions', label: `Questions (${draft.questions?.length ?? 0})` },
    { id: 'json', label: 'JSON pro' },
  ];

  return (
    <div className="min-h-full bg-slate-50 px-5 py-7 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <Link href={`/orgs/${orgId}/exams`} className="text-sm font-medium text-blue-700 hover:text-blue-800">← All exams</Link>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-semibold text-slate-950 sm:text-3xl">{draft.title}</h1>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">{draft.status ?? 'draft'}</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">{exam.attemptCount} saved attempt{exam.attemptCount === 1 ? '' : 's'} · autosave occurs for every respondent answer</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyPublicLink} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700">Copy public link</button>
            <Link href={`/orgs/${orgId}/exams/${examId}/reports`} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700">View report</Link>
            <button type="button" onClick={save} disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save exam'}</button>
          </div>
        </header>

        {message && <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>}

        <nav className="my-6 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {tabs.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`rounded-lg px-4 py-2 text-sm font-medium transition ${tab === item.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>{item.label}</button>)}
        </nav>

        {tab === 'setup' && <ExamSettingsEditor value={draft} onChange={setDraft} />}
        {tab === 'questions' && <ExamQuestionsEditor questions={draft.questions ?? []} sections={draft.sections ?? []} locked={locked} onQuestionsChange={(questions) => setDraft({ ...draft, questions })} onSectionsChange={(sections) => setDraft({ ...draft, sections })} />}
        {tab === 'json' && <ExamJsonEditor value={draft} locked={locked} onChange={setDraft} />}
      </div>
    </div>
  );
}
