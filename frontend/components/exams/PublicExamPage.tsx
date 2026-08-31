'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import type { PublicAttemptQuestion } from '@/lib/api/exams';
import { ExamSponsorBrand, StoreNineCats } from './ExamSponsorBrand';
import { PublicQuestionCard } from './PublicQuestionCard';
import { usePublicExam } from './usePublicExam';

interface PublicExamPageProps { publicId: string }

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function answerLabel(question: PublicAttemptQuestion, answer: string): string {
  return question.options.find((option) => option.id === answer)?.label ?? answer;
}

const autumnBackground = 'bg-[radial-gradient(circle_at_12%_15%,rgba(217,119,54,0.13),transparent_26%),radial-gradient(circle_at_90%_8%,rgba(0,117,74,0.10),transparent_22%),linear-gradient(180deg,#fbf5e9_0%,#f5eadb_100%)]';

export function PublicExamPage({ publicId }: PublicExamPageProps) {
  const exam = usePublicExam(publicId);
  const { activateQuestion, expireQuestion } = exam;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const initializedAttemptId = useRef<string | null>(null);
  const expiringQuestionId = useRef<string | null>(null);

  const questions = exam.attempt?.questions ?? [];
  const safeQuestionIndex = Math.min(questionIndex, Math.max(0, questions.length - 1));
  const current = questions[safeQuestionIndex];
  const currentQuestionId = current?.id;

  useEffect(() => {
    if (!exam.attempt || initializedAttemptId.current === exam.attempt.id) return;
    initializedAttemptId.current = exam.attempt.id;
    setQuestionIndex(0);
    setShortAnswers(Object.fromEntries(exam.attempt.questions.map((question) => [question.id, question.selectedAnswers[0] ?? ''])));
  }, [exam.attempt]);

  useEffect(() => {
    if (exam.attempt?.status !== 'in_progress' || !exam.attempt.oneQuestionAtATime || !currentQuestionId) return;
    void activateQuestion(currentQuestionId);
  }, [activateQuestion, currentQuestionId, exam.attempt?.oneQuestionAtATime, exam.attempt?.status]);

  useEffect(() => {
    if (exam.attempt?.status !== 'in_progress' || !exam.attempt.oneQuestionAtATime || !current) return;
    if (current.timeRemainingSeconds !== 0 || current.timedOut || expiringQuestionId.current === current.id) return;
    expiringQuestionId.current = current.id;
    const text = (shortAnswers[current.id] ?? '').trim();
    const answer = current.type === 'short_text' ? (text ? [text] : []) : current.selectedAnswers;
    void expireQuestion(current.id, answer).then((saved) => {
      if (saved && safeQuestionIndex < questions.length - 1) setQuestionIndex((index) => Math.min(questions.length - 1, index + 1));
      expiringQuestionId.current = null;
    });
  }, [current, exam.attempt?.oneQuestionAtATime, exam.attempt?.status, expireQuestion, questions.length, safeQuestionIndex, shortAnswers]);

  const submitIdentity = (event: FormEvent) => {
    event.preventDefault();
    void exam.start({ respondentName: name, respondentEmail: email, respondentIdentifier: identifier });
  };

  if (exam.loading && !exam.attempt) return <div className={`flex min-h-screen items-center justify-center ${autumnBackground} text-sm font-medium text-[#7d5132]`}>Preparing your exam…</div>;
  if (!exam.overview) return <div className={`flex min-h-screen items-center justify-center p-6 ${autumnBackground}`}><div className="max-w-md rounded-3xl border border-red-200 bg-[#fffdf8] p-8 text-center shadow-xl"><h1 className="text-xl font-semibold text-[#2f2118]">Exam unavailable</h1><p className="mt-2 text-sm text-red-700">{exam.error || 'This link is invalid or the exam is closed.'}</p></div></div>;

  if (!exam.attempt) return (
    <main className={`relative min-h-screen overflow-hidden px-5 py-8 sm:py-12 ${autumnBackground}`}>
      <div className="pointer-events-none absolute -left-16 top-36 h-44 w-44 rounded-full border-[34px] border-[#d97736]/10" />
      <div className="pointer-events-none absolute -right-12 bottom-12 h-56 w-56 rotate-12 rounded-[45%] bg-[#1e3932]/5" />
      <div className="relative mx-auto max-w-4xl">
        <div className="mb-6"><ExamSponsorBrand /></div>
        <section className="overflow-hidden rounded-[2rem] border border-[#dcc3a5] bg-[#fffdf8] shadow-[0_28px_80px_rgba(73,43,22,0.18)]">
          <div className="relative bg-[#2c1d17] px-7 py-8 text-white sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_20%_30%,#d97838_0,transparent_25%),radial-gradient(circle_at_85%_10%,#00754a_0,transparent_24%)]" />
            <div className="relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <div className="text-xs font-bold uppercase tracking-[0.24em] text-[#f4b36f]">FY2026 · Graded exam</div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{exam.overview.title}</h1>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#ead8c7]">{exam.overview.description}</p>
                <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-white/10 px-3 py-1.5">{exam.overview.durationMinutes} minutes</span>
                  <span className="rounded-full bg-white/10 px-3 py-1.5">{exam.overview.questionCount} questions</span>
                  <span className="rounded-full bg-white/10 px-3 py-1.5">Up to {exam.overview.maxAttempts} takes</span>
                  {exam.overview.preventFocusLoss && <span className="rounded-full bg-[#d97706]/25 px-3 py-1.5 text-[#ffd28c]">Focus lock on</span>}
                </div>
              </div>
              <StoreNineCats />
            </div>
          </div>
          <form onSubmit={submitIdentity} className="space-y-5 p-7 sm:p-10">
            {exam.overview.preventFocusLoss && <div className="rounded-2xl border border-[#e9b95f] bg-[#fff6dc] px-4 py-3 text-sm leading-6 text-[#754116]"><strong>Before you begin:</strong> moving to another tab, minimizing, or losing window focus will end the attempt. You will need to contact the administrator for a continue link.</div>}
            <label className="block text-sm font-semibold text-[#49372b]">Full name *<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d9bea0] bg-white px-4 py-3 outline-none focus:border-[#d97838] focus:ring-2 focus:ring-[#f4d2ab]" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-[#49372b]">Email {exam.overview.requireEmail ? '*' : '(optional)'}<input required={exam.overview.requireEmail} type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d9bea0] bg-white px-4 py-3 outline-none focus:border-[#d97838] focus:ring-2 focus:ring-[#f4d2ab]" /></label>
              <label className="block text-sm font-semibold text-[#49372b]">Student / employee ID {exam.overview.requireIdentifier ? '*' : '(optional)'}<input required={exam.overview.requireIdentifier} value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d9bea0] bg-white px-4 py-3 outline-none focus:border-[#d97838] focus:ring-2 focus:ring-[#f4d2ab]" /></label>
            </div>
            {exam.error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exam.error}</p>}
            <button type="submit" disabled={exam.loading} className="w-full rounded-xl bg-[#b95f2a] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#b95f2a]/20 transition hover:bg-[#99491f] disabled:opacity-50">{exam.loading ? 'Starting…' : 'Start exam'}</button>
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[#9b765a]">Autumn edition · Sponsored by Starbucks Store 9</p>
          </form>
        </section>
      </div>
    </main>
  );

  if (exam.attempt.status === 'terminated') return <main className={`flex min-h-screen items-center justify-center p-6 ${autumnBackground}`}><section className="max-w-lg rounded-[2rem] border border-[#e4c7a3] bg-[#fffdf8] p-8 text-center shadow-2xl"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-900">!</div><h1 className="mt-5 text-2xl font-semibold text-[#2f2118]">Attempt completed by focus protection</h1><p className="mt-3 text-sm leading-6 text-[#705746]">The exam detected that this window lost focus. Your answers were saved. Contact your administrator and ask for a continue link.</p><p className="mt-5 rounded-xl bg-[#f4eadf] px-4 py-3 text-xs text-[#876650]">Attempt #{exam.attempt.attemptNumber} · reason: {exam.attempt.terminationReason || 'focus policy'}</p><button type="button" onClick={exam.startAnother} className="mt-5 rounded-xl border border-[#d3b18a] px-4 py-2.5 text-sm font-semibold text-[#68452d] hover:bg-[#fff5e8]">Different respondent</button><p className="mt-2 text-xs text-[#947056]">The terminated attempt stays saved for the administrator.</p></section></main>;

  if (exam.attempt.status === 'completed') return (
    <main className={`min-h-screen px-5 py-10 ${autumnBackground}`}><div className="mx-auto max-w-3xl"><div className="mb-6"><ExamSponsorBrand /></div><section className="rounded-[2rem] border border-[#e4c7a3] bg-[#fffdf8] p-8 shadow-xl"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dce9df] text-xl text-[#00754a]">✓</div><h1 className="mt-5 text-3xl font-semibold text-[#2f2118]">Exam complete</h1><p className="mt-2 text-sm text-[#705746]">Every saved answer remains available to the administrator.</p>{exam.attempt.questions.length > 0 && <div className="mt-8 space-y-4">{exam.attempt.questions.map((question, index) => <article key={question.id} className="rounded-2xl border border-[#ead8c2] bg-white p-5"><h2 className="font-medium text-[#33241b]">{index + 1}. {question.prompt}</h2><div className="mt-3 text-sm text-[#624a3a]"><span className="font-semibold">Your answer:</span> {question.selectedAnswers.length ? question.selectedAnswers.map((answer) => answerLabel(question, answer)).join(', ') : 'No answer'}</div>{question.correctAnswers && <div className="mt-2 text-sm text-[#00754a]"><span className="font-semibold">Correct answer:</span> {question.correctAnswers.map((answer) => answerLabel(question, answer)).join(', ')}</div>}{question.explanation && <p className="mt-3 text-sm leading-6 text-[#80634f]">{question.explanation}</p>}</article>)}</div>}<button type="button" onClick={exam.startAnother} className="mt-8 rounded-xl border border-[#d3b18a] px-4 py-2.5 text-sm font-semibold text-[#68452d]">Start another allowed attempt</button></section></div></main>
  );

  if (!current) return null;
  const answeredCount = questions.filter((question) => question.selectedAnswers.length > 0).length;
  const setChoice = (question: PublicAttemptQuestion, value: string) => {
    if (question.timedOut) return;
    const next = question.type === 'multiple_choice'
      ? (question.selectedAnswers.includes(value) ? question.selectedAnswers.filter((item) => item !== value) : [...question.selectedAnswers, value])
      : [value];
    void exam.saveAnswer(question.id, next);
  };
  const displayedQuestions = exam.attempt.oneQuestionAtATime
    ? [{ question: current, index: safeQuestionIndex }]
    : questions.map((question, index) => ({ question, index }));

  return (
    <main className={`min-h-screen ${autumnBackground}`}>
      <header className="sticky top-0 z-10 border-b border-[#ddc6aa] bg-[#fffaf1]/95 px-5 py-3 backdrop-blur"><div className="mx-auto flex max-w-4xl items-center justify-between gap-4"><div className="hidden sm:block"><ExamSponsorBrand compact /></div><div className="min-w-0 flex-1 sm:text-center"><h1 className="truncate text-sm font-bold text-[#33241b]">{exam.attempt.title}</h1><p className="mt-0.5 text-xs text-[#8a6951]">{exam.attempt.oneQuestionAtATime ? `Question ${safeQuestionIndex + 1} of ${questions.length}` : 'All questions'} · {answeredCount} answered</p></div><div className={`rounded-xl px-4 py-2 font-mono text-lg font-bold ${exam.attempt.remainingSeconds < 120 ? 'bg-red-50 text-red-700' : 'bg-[#2c1d17] text-[#fff5e7]'}`}>{formatTime(exam.attempt.remainingSeconds)}</div></div></header>
      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-5 h-2 overflow-hidden rounded-full bg-[#eadac7]"><div className="h-full rounded-full bg-gradient-to-r from-[#b95f2a] to-[#e49b45] transition-all" style={{ width: `${exam.attempt.oneQuestionAtATime ? ((safeQuestionIndex + 1) / questions.length) * 100 : (answeredCount / questions.length) * 100}%` }} /></div>
        <div className="space-y-5">{displayedQuestions.map(({ question, index }) => <PublicQuestionCard key={question.id} question={question} number={index + 1} shortValue={shortAnswers[question.id] ?? ''} saving={exam.savingQuestionId === question.id} onShortChange={(value) => setShortAnswers((answers) => ({ ...answers, [question.id]: value }))} onSaveShort={() => { if (!question.timedOut) void exam.saveAnswer(question.id, (shortAnswers[question.id] ?? '').trim() ? [(shortAnswers[question.id] ?? '').trim()] : []); }} onChoice={(value) => setChoice(question, value)} />)}</div>
        {exam.error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exam.error}</div>}
        {exam.attempt.oneQuestionAtATime ? <div className="mt-5 flex items-center justify-between gap-3"><button type="button" onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))} disabled={safeQuestionIndex === 0} className="rounded-xl border border-[#d3b18a] bg-[#fffdf8] px-5 py-2.5 text-sm font-semibold text-[#68452d] disabled:opacity-40">Previous</button>{safeQuestionIndex < questions.length - 1 ? <button type="button" onClick={() => setQuestionIndex((index) => Math.min(questions.length - 1, index + 1))} className="rounded-xl bg-[#2c1d17] px-6 py-2.5 text-sm font-bold text-white">Next question</button> : <button type="button" onClick={() => setConfirmingSubmit(true)} disabled={exam.loading} className="rounded-xl bg-[#00754a] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">Submit exam</button>}</div> : <div className="mt-6 flex justify-end"><button type="button" onClick={() => setConfirmingSubmit(true)} disabled={exam.loading} className="rounded-xl bg-[#00754a] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">Submit exam</button></div>}
      </div>
      {confirmingSubmit && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#21140f]/70 p-5" role="dialog" aria-modal="true" aria-labelledby="submit-exam-title"><section className="w-full max-w-md rounded-3xl border border-[#e4c7a3] bg-[#fffdf8] p-7 shadow-2xl"><h2 id="submit-exam-title" className="text-xl font-semibold text-[#2f2118]">Submit this exam?</h2><p className="mt-3 text-sm leading-6 text-[#705746]">Your latest answer will finish saving before the attempt is finalized.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setConfirmingSubmit(false)} className="rounded-xl border border-[#d3b18a] px-4 py-2.5 text-sm font-semibold text-[#68452d]">Keep reviewing</button><button type="button" onClick={() => { setConfirmingSubmit(false); void exam.submit(); }} disabled={exam.loading} className="rounded-xl bg-[#00754a] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{exam.loading ? 'Submitting…' : 'Submit exam'}</button></div></section></div>}
    </main>
  );
}
