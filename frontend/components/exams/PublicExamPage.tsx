'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import type { PublicAttemptQuestion } from '@/lib/api/exams';
import { usePublicExam } from './usePublicExam';
import { PublicQuestionCard } from './PublicQuestionCard';

interface PublicExamPageProps { publicId: string }

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function answerLabel(question: PublicAttemptQuestion, answer: string): string {
  return question.options.find((option) => option.id === answer)?.label ?? answer;
}

export function PublicExamPage({ publicId }: PublicExamPageProps) {
  const exam = usePublicExam(publicId);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const initializedAttemptId = useRef<string | null>(null);

  useEffect(() => {
    if (!exam.attempt || initializedAttemptId.current === exam.attempt.id) return;
    initializedAttemptId.current = exam.attempt.id;
    setShortAnswers(Object.fromEntries(exam.attempt.questions.map((question) => [question.id, question.selectedAnswers[0] ?? ''])));
  }, [exam.attempt]);

  if (exam.loading && !exam.attempt) return <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">Preparing exam…</div>;
  if (!exam.overview) return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center"><h1 className="text-xl font-semibold text-slate-900">Exam unavailable</h1><p className="mt-2 text-sm text-red-600">{exam.error || 'This link is invalid or the exam is closed.'}</p></div></div>;

  if (!exam.attempt) {
    const submitIdentity = (event: FormEvent) => {
      event.preventDefault();
      void exam.start({ respondentName: name, respondentEmail: email, respondentIdentifier: identifier });
    };
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-800"><span className="text-blue-600">〜</span> airunote exams</div>
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
            <div className="border-b border-slate-100 bg-slate-950 px-7 py-8 text-white">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Graded exam</div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">{exam.overview.title}</h1>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{exam.overview.description}</p>
              <div className="mt-6 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-white/10 px-3 py-1.5">{exam.overview.durationMinutes} minutes</span><span className="rounded-full bg-white/10 px-3 py-1.5">{exam.overview.questionCount} questions</span><span className="rounded-full bg-white/10 px-3 py-1.5">Up to {exam.overview.maxAttempts} takes</span>{exam.overview.preventFocusLoss && <span className="rounded-full bg-amber-400/20 px-3 py-1.5 text-amber-200">Focus lock on</span>}</div>
            </div>
            <form onSubmit={submitIdentity} className="space-y-5 p-7">
              {exam.overview.preventFocusLoss && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"><strong>Before you begin:</strong> moving to another tab, minimizing, or losing window focus will end the attempt. You will need to contact the administrator for a continue link.</div>}
              <label className="block text-sm font-medium text-slate-700">Full name *<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">Email {exam.overview.requireEmail ? '*' : '(optional)'}<input required={exam.overview.requireEmail} type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
                <label className="block text-sm font-medium text-slate-700">Student / employee ID {exam.overview.requireIdentifier ? '*' : '(optional)'}<input required={exam.overview.requireIdentifier} value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3" /></label>
              </div>
              {exam.error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{exam.error}</p>}
              <button type="submit" disabled={exam.loading} className="w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{exam.loading ? 'Starting…' : 'Start exam'}</button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  if (exam.attempt.status === 'terminated') return <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6"><section className="max-w-lg rounded-3xl bg-white p-8 text-center shadow-2xl"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl">!</div><h1 className="mt-5 text-2xl font-semibold text-slate-950">Attempt completed by focus protection</h1><p className="mt-3 text-sm leading-6 text-slate-600">The exam detected that this window lost focus. Your answers were saved. Contact your administrator and ask for a continue link.</p><p className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-500">Attempt #{exam.attempt.attemptNumber} · reason: {exam.attempt.terminationReason || 'focus policy'}</p><button type="button" onClick={exam.startAnother} className="mt-5 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Different respondent</button><p className="mt-2 text-xs text-slate-500">The terminated attempt stays saved for the administrator.</p></section></main>;

  if (exam.attempt.status === 'completed') return (
    <main className="min-h-screen bg-slate-50 px-5 py-10"><div className="mx-auto max-w-3xl"><section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">✓</div><h1 className="mt-5 text-3xl font-semibold text-slate-950">Exam complete</h1><p className="mt-2 text-sm text-slate-600">Every saved answer remains available to the administrator.</p>{exam.attempt.questions.length > 0 && <div className="mt-8 space-y-4">{exam.attempt.questions.map((question, index) => <article key={question.id} className="rounded-2xl border border-slate-200 p-5"><h2 className="font-medium text-slate-900">{index + 1}. {question.prompt}</h2><div className="mt-3 text-sm text-slate-700"><span className="font-medium">Your answer:</span> {question.selectedAnswers.length ? question.selectedAnswers.map((answer) => answerLabel(question, answer)).join(', ') : 'No answer'}</div>{question.correctAnswers && <div className="mt-2 text-sm text-emerald-700"><span className="font-medium">Correct answer:</span> {question.correctAnswers.map((answer) => answerLabel(question, answer)).join(', ')}</div>}{question.explanation && <p className="mt-3 text-sm leading-6 text-slate-500">{question.explanation}</p>}</article>)}</div>}<button type="button" onClick={exam.startAnother} className="mt-8 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">Start another allowed attempt</button></section></div></main>
  );

  const questions = exam.attempt.questions;
  const current = questions[Math.min(questionIndex, questions.length - 1)];
  if (!current) return null;
  const answeredCount = questions.filter((question) => question.selectedAnswers.length > 0).length;
  const setChoice = (question: PublicAttemptQuestion, value: string) => {
    const next = question.type === 'multiple_choice'
      ? (question.selectedAnswers.includes(value) ? question.selectedAnswers.filter((item) => item !== value) : [...question.selectedAnswers, value])
      : [value];
    void exam.saveAnswer(question.id, next);
  };
  const displayedQuestions = exam.attempt.oneQuestionAtATime
    ? [{ question: current, index: questionIndex }]
    : questions.map((question, index) => ({ question, index }));

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur"><div className="mx-auto flex max-w-4xl items-center justify-between gap-4"><div className="min-w-0"><h1 className="truncate text-sm font-semibold text-slate-900">{exam.attempt.title}</h1><p className="mt-0.5 text-xs text-slate-500">{exam.attempt.oneQuestionAtATime ? `Question ${questionIndex + 1} of ${questions.length}` : 'All questions'} · {answeredCount} answered</p></div><div className={`rounded-xl px-4 py-2 font-mono text-lg font-semibold ${exam.attempt.remainingSeconds < 120 ? 'bg-red-50 text-red-700' : 'bg-slate-950 text-white'}`}>{formatTime(exam.attempt.remainingSeconds)}</div></div></header>
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${exam.attempt.oneQuestionAtATime ? ((questionIndex + 1) / questions.length) * 100 : (answeredCount / questions.length) * 100}%` }} /></div>
        <div className="space-y-5">{displayedQuestions.map(({ question, index }) => <PublicQuestionCard key={question.id} question={question} number={index + 1} shortValue={shortAnswers[question.id] ?? ''} saving={exam.savingQuestionId === question.id} onShortChange={(value) => setShortAnswers((answers) => ({ ...answers, [question.id]: value }))} onSaveShort={() => void exam.saveAnswer(question.id, (shortAnswers[question.id] ?? '').trim() ? [(shortAnswers[question.id] ?? '').trim()] : [])} onChoice={(value) => setChoice(question, value)} />)}</div>
        {exam.error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exam.error}</div>}
        {exam.attempt.oneQuestionAtATime ? <div className="mt-5 flex items-center justify-between gap-3"><button type="button" onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))} disabled={questionIndex === 0} className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium disabled:opacity-40">Previous</button>{questionIndex < questions.length - 1 ? <button type="button" onClick={() => setQuestionIndex((index) => Math.min(questions.length - 1, index + 1))} className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white">Next question</button> : <button type="button" onClick={() => setConfirmingSubmit(true)} disabled={exam.loading} className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Submit exam</button>}</div> : <div className="mt-6 flex justify-end"><button type="button" onClick={() => setConfirmingSubmit(true)} disabled={exam.loading} className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">Submit exam</button></div>}
      </div>
      {confirmingSubmit && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5" role="dialog" aria-modal="true" aria-labelledby="submit-exam-title"><section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl"><h2 id="submit-exam-title" className="text-xl font-semibold text-slate-950">Submit this exam?</h2><p className="mt-3 text-sm leading-6 text-slate-600">Your latest answer will finish saving before the attempt is finalized.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setConfirmingSubmit(false)} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">Keep reviewing</button><button type="button" onClick={() => { setConfirmingSubmit(false); void exam.submit(); }} disabled={exam.loading} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{exam.loading ? 'Submitting…' : 'Submit exam'}</button></div></section></div>}
    </main>
  );
}
