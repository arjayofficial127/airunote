'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { examsApi, type ExamQuestion, type ExamReport } from '@/lib/api/exams';
import { useHydratedContent } from '@/providers/HydratedContentProvider';
import { useOrgSession } from '@/providers/OrgSessionProvider';

interface ExamReportsProps { examId: string }

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

function answerText(question: ExamQuestion, answers: string[]): string {
  if (answers.length === 0) return '—';
  return answers.map((answer) => question.options.find((option) => option.id === answer)?.label ?? answer).join(', ');
}

export function ExamReports({ examId }: ExamReportsProps) {
  const orgSession = useOrgSession();
  const { getHydrated, hydrate, refreshEntity } = useHydratedContent();
  const [tab, setTab] = useState<'live' | 'matrix' | 'questions'>('live');
  const [message, setMessage] = useState<string | null>(null);
  const orgId = orgSession.activeOrgId;
  const report = getHydrated<ExamReport>('examReport', examId);

  useEffect(() => { void hydrate('examReport', examId); }, [examId, hydrate]);
  useEffect(() => {
    const timer = window.setInterval(() => { void refreshEntity('examReport', examId); }, 5000);
    return () => window.clearInterval(timer);
  }, [examId, refreshEntity]);

  const questionById = useMemo(() => new Map(report?.exam.questions.map((question) => [question.id, question]) ?? []), [report]);

  const issueContinueLink = async (attemptId: string) => {
    if (!orgId) return;
    try {
      const result = await examsApi.continueAttempt(orgId, examId, attemptId, 5);
      await navigator.clipboard.writeText(`${window.location.origin}${result.path}`);
      setMessage('Continue link copied with five additional minutes. The old link is now invalid.');
      await refreshEntity('examReport', examId);
    } catch (error) {
      console.error('Failed to issue continue link', error);
      setMessage('Could not issue the continue link.');
    }
  };

  if (!report) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">Building live report…</div>;

  const active = report.respondents.filter((respondent) => respondent.active);
  const stats = [
    ['Attempts', report.summary.totalAttempts, 'text-slate-950'],
    ['Active now', report.summary.activeNow, 'text-blue-700'],
    ['Completed', report.summary.completed, 'text-emerald-700'],
    ['Needs admin', report.summary.terminated, 'text-amber-700'],
  ];

  return (
    <div className="min-h-full bg-slate-50 px-5 py-7 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1400px]">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div><Link href={`/orgs/${orgId}/exams/${examId}`} className="text-sm font-medium text-blue-700">← Back to editor</Link><h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{report.exam.title}</h1><p className="mt-2 text-sm text-slate-500">Live grading report · refreshes every 5 seconds · {new Date(report.generatedAt).toLocaleTimeString()}</p></div>
          <div className="flex gap-2"><button type="button" onClick={() => void refreshEntity('examReport', examId)} className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium">Refresh now</button><Link href={`/exam/${report.exam.publicId}`} target="_blank" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">Open public exam</Link></div>
        </header>

        {message && <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>}
        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value, color]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-3 text-3xl font-semibold ${color}`}>{value}</p></div>)}</section>

        <nav className="my-6 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">{([['live', 'Live attempts'], ['matrix', 'Answer matrix'], ['questions', 'Question chart']] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setTab(id)} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === id ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>{label}</button>)}</nav>

        {tab === 'live' && <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-6 py-4"><h2 className="font-semibold text-slate-950">Answering now</h2><p className="mt-1 text-xs text-slate-500">Active means a heartbeat or saved answer was received in the last 45 seconds.</p></div>{active.length === 0 ? <p className="px-6 py-10 text-center text-sm text-slate-500">Nobody is actively answering right now.</p> : <div className="divide-y divide-slate-100">{active.map((respondent) => { const activeQuestionIndex = report.exam.questions.findIndex((question) => question.id === respondent.activeQuestionId); return <div key={respondent.id} className="grid gap-3 px-6 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="font-medium text-slate-900">{respondent.respondentName}</p><p className="mt-1 text-xs text-slate-500">Attempt #{respondent.attemptNumber} · {Object.values(respondent.answers).filter((answer) => answer.length > 0).length}/{report.exam.questions.length} answered · {activeQuestionIndex >= 0 ? `active near Q${activeQuestionIndex + 1}` : 'starting exam'}</p></div><div className="text-sm text-slate-600"><span className="font-medium text-slate-900">{formatDuration(respondent.timeInExamSeconds)}</span> in exam</div><div className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">{formatDuration(respondent.remainingSeconds)} left</div></div>; })}</div>}</section>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-6 py-4"><h2 className="font-semibold text-slate-950">All attempts</h2></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Respondent</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Time</th><th className="px-5 py-3">Score</th><th className="px-5 py-3">Focus</th><th className="px-5 py-3">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{report.respondents.map((respondent) => <tr key={respondent.id}><td className="px-5 py-4"><div className="font-medium text-slate-900">{respondent.respondentName}</div><div className="mt-1 text-xs text-slate-500">{respondent.respondentIdentifier || respondent.respondentEmail || `Attempt #${respondent.attemptNumber}`}</div></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${respondent.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : respondent.status === 'terminated' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>{respondent.status.replace('_', ' ')}</span></td><td className="px-5 py-4 text-slate-600">{formatDuration(respondent.timeInExamSeconds)}</td><td className="px-5 py-4 font-medium text-slate-900">{respondent.percentage === null ? 'Pending grade' : `${respondent.earnedPoints}/${respondent.possiblePoints} · ${respondent.percentage}%`}</td><td className="px-5 py-4 text-slate-600">{respondent.focusViolationCount}</td><td className="px-5 py-4">{respondent.status !== 'in_progress' && <button type="button" onClick={() => void issueContinueLink(respondent.id)} className="text-sm font-medium text-blue-700 hover:text-blue-800">Copy continue link</button>}</td></tr>)}</tbody></table></div></section>
        </div>}

        {tab === 'matrix' && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-100 px-6 py-4"><h2 className="font-semibold text-slate-950">Answers matrix</h2><p className="mt-1 text-xs text-slate-500">Every cell comes from the latest autosaved answer, including incomplete attempts.</p></div><div className="max-h-[70vh] overflow-auto"><table className="min-w-max text-left text-xs"><thead className="sticky top-0 z-[1] bg-slate-950 text-white"><tr><th className="sticky left-0 z-[2] min-w-52 bg-slate-950 px-4 py-3">Respondent</th>{report.exam.questions.map((question, index) => <th key={question.id} className="min-w-48 max-w-72 px-4 py-3"><span className="block text-blue-300">Q{index + 1}</span><span className="mt-1 block line-clamp-2 font-normal text-slate-300">{question.prompt}</span></th>)}</tr></thead><tbody className="divide-y divide-slate-100">{report.respondents.map((respondent) => <tr key={respondent.id}><td className="sticky left-0 bg-white px-4 py-3 font-medium text-slate-900 shadow-[1px_0_0_#e2e8f0]">{respondent.respondentName}</td>{report.exam.questions.map((question) => <td key={question.id} className="max-w-72 whitespace-normal px-4 py-3 leading-5 text-slate-700">{answerText(question, respondent.answers[question.id] ?? [])}</td>)}</tr>)}</tbody></table></div></section>}

        {tab === 'questions' && <section className="space-y-4">{report.questionPerformance.map((item, index) => { const question = questionById.get(item.questionId); return <article key={item.questionId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Question {index + 1}</p><h2 className="mt-2 font-medium leading-6 text-slate-950">{item.prompt}</h2><p className="mt-2 text-xs text-slate-500">{item.graded && question?.correctAnswers.length ? `${item.points} points · ${item.correctCount} of ${item.answeredCount} correct` : 'Not currently graded — historical answers are preserved.'}</p></div><div className="text-2xl font-semibold text-slate-950">{item.correctPercentage === null ? '—' : `${item.correctPercentage}%`}</div></div><div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${item.correctPercentage ?? 0}%` }} /></div>{item.correctRespondents.length > 0 && <p className="mt-3 text-xs leading-5 text-slate-600"><span className="font-medium text-slate-800">Correct:</span> {item.correctRespondents.map((person) => person.name).join(', ')}</p>}</article>; })}</section>}
      </div>
    </div>
  );
}
