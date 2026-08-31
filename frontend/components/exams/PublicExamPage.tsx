'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import type { PublicAttemptQuestion, PublicExamOverview } from '@/lib/api/exams';
import { AutumnBackdrop, AutumnHeroBranches } from './AutumnDecorations';
import { ExamSponsorBrand, StoreNineCats } from './ExamSponsorBrand';
import { PublicQuestionCard } from './PublicQuestionCard';
import { useExamSounds } from './useExamSounds';
import { usePublicExam, type ExamSyncStatus } from './usePublicExam';

interface PublicExamPageProps { publicId: string }

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  return `${minutes}:${(seconds % 60).toString().padStart(2, '0')}`;
}

function answerLabel(question: PublicAttemptQuestion, answer: string): string {
  return question.options.find((option) => option.id === answer)?.label ?? answer;
}

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, seconds);
  const days = Math.floor(safe / 86_400);
  const hours = Math.floor((safe % 86_400) / 3_600);
  const minutes = Math.floor((safe % 3_600) / 60);
  const remainder = safe % 60;
  return days > 0
    ? `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${remainder.toString().padStart(2, '0')}s`
    : `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
}

function formatScheduleDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

const autumnBackground = 'bg-[radial-gradient(circle_at_12%_15%,rgba(217,119,54,0.13),transparent_26%),radial-gradient(circle_at_90%_8%,rgba(0,117,74,0.10),transparent_22%),linear-gradient(180deg,#fbf5e9_0%,#f5eadb_100%)]';

function SoundChip({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return <button type="button" onClick={onToggle} aria-pressed={enabled} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#d8b88f] bg-[#fffaf1] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#704a31] shadow-sm"><span aria-hidden="true">{enabled ? '♪' : '×'}</span>{enabled ? 'Sound on' : 'Sound off'}</button>;
}

function SyncChip({ status, count, onRetry }: { status: ExamSyncStatus; count: number; onRetry: () => void }) {
  const synced = status === 'synced' && count === 0;
  const label = synced
    ? 'Saved'
    : status === 'saving'
      ? `Saving ${count}`
      : status === 'offline'
        ? `${count} offline`
        : status === 'error'
          ? `${count} needs retry`
          : `Retrying ${count}`;
  return <button type="button" onClick={onRetry} disabled={synced || status === 'saving'} title={synced ? 'Every answer is saved on the server' : 'Answers are safe on this device. Select to retry server synchronization.'} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.1em] shadow-sm disabled:cursor-default ${synced ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : status === 'error' || status === 'offline' ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-sky-200 bg-sky-50 text-sky-800'}`}><span aria-hidden="true">{synced ? '✓' : status === 'offline' ? '↯' : '↻'}</span>{label}</button>;
}

function ScheduledExamNotice({ overview, state, seconds }: { overview: PublicExamOverview; state: 'upcoming' | 'ended' | 'unavailable'; seconds?: number }) {
  const upcoming = state === 'upcoming';
  return (
    <main className={`min-h-screen px-5 py-10 ${autumnBackground}`}>
      <AutumnBackdrop />
      <div className="relative z-[1] mx-auto max-w-3xl">
        <div className="mb-6"><ExamSponsorBrand /></div>
        <section className="overflow-hidden rounded-[2rem] border border-[#dcc3a5] bg-[#fffdf8] shadow-[0_28px_80px_rgba(73,43,22,0.16)]">
          <div className="relative overflow-hidden bg-[#2c1d17] px-7 py-8 text-white sm:px-10">
            <AutumnHeroBranches />
            <div className="relative"><div className="text-xs font-bold uppercase tracking-[0.24em] text-[#f4b36f]">Scheduled graded exam</div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">{overview.title}</h1>
            {overview.description && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#ead8c7]">{overview.description}</p>}</div>
          </div>
          <div className="p-7 text-center sm:p-10">
            <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl ${upcoming ? 'bg-[#fff0d5] text-[#a94e21]' : 'bg-[#eee4d9] text-[#725441]'}`}>{upcoming ? '◷' : '—'}</div>
            <h2 className="mt-5 text-2xl font-bold text-[#2f2118]">{upcoming ? 'You’re early — the exam opens soon' : state === 'ended' ? 'The response window has ended' : 'This exam isn’t open right now'}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#705746]">{upcoming ? 'You can keep this page open. The start form will appear automatically when the countdown reaches zero.' : state === 'ended' ? 'New attempts are no longer being accepted. If you believe you should still have access, please contact the exam administrator.' : 'The administrator may still be preparing this exam or may have paused responses. Please check the link again later or contact them for access.'}</p>
            {upcoming && overview.startsAt && <><div className="mx-auto mt-7 max-w-md rounded-2xl border border-[#e5c08a] bg-[#fff8e8] px-5 py-5"><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9a6b45]">Opens in</div><div className="mt-2 font-mono text-3xl font-black tracking-tight text-[#8d431e]" aria-live="polite">{formatCountdown(seconds ?? 0)}</div></div><p className="mt-4 text-xs font-semibold text-[#8c6a51]">Scheduled for {formatScheduleDate(overview.startsAt)}</p></>}
          </div>
        </section>
      </div>
    </main>
  );
}

export function PublicExamPage({ publicId }: PublicExamPageProps) {
  const exam = usePublicExam(publicId);
  const { activateQuestion, expireQuestion } = exam;
  const { soundEnabled, toggleSound, primeSound, playNext, playCelebration } = useExamSounds();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [shortAnswers, setShortAnswers] = useState<Record<string, string>>({});
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [clockTick, setClockTick] = useState(() => Date.now());
  const initializedAttemptId = useRef<string | null>(null);
  const expiringQuestionId = useRef<string | null>(null);
  const serverClockOffset = useRef(0);
  const celebratedAttemptId = useRef<string | null>(null);

  const questions = exam.attempt?.questions ?? [];
  const safeQuestionIndex = Math.min(questionIndex, Math.max(0, questions.length - 1));
  const current = questions[safeQuestionIndex];
  const currentQuestionId = current?.id;

  useEffect(() => {
    if (!exam.overview?.serverTime) return;
    serverClockOffset.current = Date.parse(exam.overview.serverTime) - Date.now();
    setClockTick(Date.now());
  }, [exam.overview?.serverTime]);

  useEffect(() => {
    if (!exam.overview || (!exam.overview.startsAt && !exam.overview.endsAt)) return;
    const timer = window.setInterval(() => setClockTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [exam.overview]);

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
      if (saved && safeQuestionIndex < questions.length - 1) {
        playNext();
        setQuestionIndex((index) => Math.min(questions.length - 1, index + 1));
      }
      expiringQuestionId.current = null;
    });
  }, [current, exam.attempt?.oneQuestionAtATime, exam.attempt?.status, expireQuestion, playNext, questions.length, safeQuestionIndex, shortAnswers]);

  useEffect(() => {
    if (exam.attempt?.status !== 'completed' || celebratedAttemptId.current === exam.attempt.id) return;
    celebratedAttemptId.current = exam.attempt.id;
    playCelebration();
  }, [exam.attempt?.id, exam.attempt?.status, playCelebration]);

  const submitIdentity = (event: FormEvent) => {
    event.preventDefault();
    primeSound();
    void exam.start({ respondentName: name, respondentEmail: email, respondentIdentifier: identifier });
  };

  if (exam.loading && !exam.attempt) return <div className={`flex min-h-screen items-center justify-center ${autumnBackground} text-sm font-medium text-[#7d5132]`}>Preparing your exam…</div>;
  if (!exam.overview) return <div className={`flex min-h-screen items-center justify-center p-6 ${autumnBackground}`}><div className="max-w-md rounded-3xl border border-red-200 bg-[#fffdf8] p-8 text-center shadow-xl"><h1 className="text-xl font-semibold text-[#2f2118]">Exam unavailable</h1><p className="mt-2 text-sm text-red-700">{exam.error || 'This link is invalid or currently unavailable.'}</p></div></div>;

  const scheduledNow = clockTick + serverClockOffset.current;
  const secondsUntilStart = exam.overview.startsAt ? Math.max(0, Math.ceil((Date.parse(exam.overview.startsAt) - scheduledNow) / 1000)) : null;
  const secondsUntilEnd = exam.overview.endsAt ? Math.ceil((Date.parse(exam.overview.endsAt) - scheduledNow) / 1000) : null;
  const scheduledAvailability = exam.overview.availability === 'upcoming' && secondsUntilStart === 0
    ? 'open'
    : exam.overview.availability;
  const availability = (scheduledAvailability === 'open' || scheduledAvailability === 'upcoming')
    && secondsUntilEnd !== null && secondsUntilEnd <= 0
    ? 'ended'
    : scheduledAvailability;

  if (!exam.attempt && availability === 'upcoming') return <ScheduledExamNotice overview={exam.overview} state="upcoming" seconds={secondsUntilStart ?? 0} />;
  if (!exam.attempt && availability === 'ended') return <ScheduledExamNotice overview={exam.overview} state="ended" />;
  if (!exam.attempt && availability === 'unavailable') return <ScheduledExamNotice overview={exam.overview} state="unavailable" />;

  if (!exam.attempt) return (
    <main className={`relative min-h-screen overflow-hidden px-5 py-8 sm:py-12 ${autumnBackground}`}>
      <AutumnBackdrop />
      <div className="pointer-events-none absolute -left-16 top-36 h-44 w-44 rounded-full border-[34px] border-[#d97736]/10" />
      <div className="pointer-events-none absolute -right-12 bottom-12 h-56 w-56 rotate-12 rounded-[45%] bg-[#1e3932]/5" />
      <div className="relative z-[1] mx-auto max-w-4xl">
        <div className="mb-6 flex items-end justify-between gap-4"><ExamSponsorBrand /><SoundChip enabled={soundEnabled} onToggle={toggleSound} /></div>
        <section className="overflow-hidden rounded-[2rem] border border-[#dcc3a5] bg-[#fffdf8] shadow-[0_28px_80px_rgba(73,43,22,0.18)]">
          <div className="relative bg-[#2c1d17] px-7 py-8 text-white sm:px-10 sm:py-10">
            <AutumnHeroBranches />
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
            {secondsUntilEnd !== null && secondsUntilEnd > 0 && secondsUntilEnd <= 1_800 && <div className="rounded-2xl border border-orange-300 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-900"><strong>The response window closes soon:</strong> {formatCountdown(secondsUntilEnd)} remaining, until {formatScheduleDate(exam.overview.endsAt!)}. Start only if you have enough time to finish.</div>}
            <label className="block text-sm font-semibold text-[#49372b]">Full name *<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d9bea0] bg-white px-4 py-3 outline-none focus:border-[#d97838] focus:ring-2 focus:ring-[#f4d2ab]" /></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-[#49372b]">Email {exam.overview.requireEmail ? '*' : '(optional)'}<input required={exam.overview.requireEmail} type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d9bea0] bg-white px-4 py-3 outline-none focus:border-[#d97838] focus:ring-2 focus:ring-[#f4d2ab]" /></label>
              <label className="block text-sm font-semibold text-[#49372b]">Student / employee ID {exam.overview.requireIdentifier ? '*' : '(optional)'}<input required={exam.overview.requireIdentifier} value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="mt-2 w-full rounded-xl border border-[#d9bea0] bg-white px-4 py-3 outline-none focus:border-[#d97838] focus:ring-2 focus:ring-[#f4d2ab]" /></label>
            </div>
            {exam.error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exam.error}</p>}
            <button type="submit" disabled={exam.loading} className="w-full rounded-xl bg-[#b95f2a] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#b95f2a]/20 transition hover:bg-[#99491f] disabled:opacity-50">{exam.loading ? 'Starting…' : 'Start exam'}</button>
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[#9b765a]">Autumn edition · Sponsored by Starbucks Store 386 Nepo Center, Marry Furrmily</p>
          </form>
        </section>
      </div>
    </main>
  );

  if (exam.attempt.status === 'terminated') return <main className={`relative flex min-h-screen items-center justify-center overflow-hidden p-6 ${autumnBackground}`}><AutumnBackdrop /><section className="relative z-[1] max-w-lg rounded-[2rem] border border-[#e4c7a3] bg-[#fffdf8] p-8 text-center shadow-2xl"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-2xl text-amber-900">!</div><h1 className="mt-5 text-2xl font-semibold text-[#2f2118]">Attempt paused by focus protection</h1><p className="mt-3 text-sm leading-6 text-[#705746]">The exam detected that this window lost focus. Your answers and end time were saved. Contact your administrator if you need a continue link.</p><p className="mt-5 rounded-xl bg-[#f4eadf] px-4 py-3 text-xs text-[#876650]">Attempt #{exam.attempt.attemptNumber} · reason: {exam.attempt.terminationReason || 'focus policy'}</p>{!exam.attempt.isPreview && <button type="button" onClick={exam.startAnother} className="mt-5 rounded-xl border border-[#d3b18a] px-4 py-2.5 text-sm font-semibold text-[#68452d] hover:bg-[#fff5e8]">Different respondent</button>}<p className="mt-2 text-xs text-[#947056]">The interrupted attempt stays visible in the administrator’s audit report.</p></section></main>;

  if (exam.attempt.status === 'timed_out' || exam.attempt.status === 'abandoned' || exam.attempt.status === 'void') return <main className={`relative flex min-h-screen items-center justify-center overflow-hidden p-6 ${autumnBackground}`}><AutumnBackdrop /><section className="relative z-[1] max-w-lg rounded-[2rem] border border-[#e4c7a3] bg-[#fffdf8] p-8 text-center shadow-2xl"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#eee4d9] text-2xl text-[#725441]">◷</div><h1 className="mt-5 text-2xl font-semibold text-[#2f2118]">{exam.attempt.status === 'timed_out' ? 'Time has ended for this attempt' : exam.attempt.status === 'void' ? 'This attempt was marked void' : 'This attempt is no longer active'}</h1><p className="mt-3 text-sm leading-6 text-[#705746]">Your saved answers remain on record. Contact the exam administrator if you need help or permission to retake.</p></section></main>;

  if (exam.attempt.status === 'completed') return (
    <main className={`relative min-h-screen overflow-hidden px-5 py-10 ${autumnBackground}`}><AutumnBackdrop /><div className="relative z-[1] mx-auto max-w-3xl"><div className="mb-6 flex items-end justify-between gap-4"><ExamSponsorBrand /><SoundChip enabled={soundEnabled} onToggle={toggleSound} /></div><section className="relative overflow-hidden rounded-[2rem] border border-[#e4c7a3] bg-[#fffdf8] p-8 shadow-xl">{exam.attempt.isPreview && <div className="mb-5 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800">Admin preview · test only · {exam.attempt.previewedByEmail} · excluded from respondent statistics</div>}<div className="pointer-events-none absolute right-6 top-5 text-5xl">🍂</div><div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#fff0d5] text-2xl text-[#b95f2a]">✓</div><div className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-[#d06426]">Hooray!</div><h1 className="mt-2 text-3xl font-bold text-[#2f2118]">{exam.attempt.isPreview ? 'Preview completed' : 'You completed the exam 🎉'}</h1><p className="mt-2 text-sm leading-6 text-[#705746]">{exam.attempt.isPreview ? 'This authenticated preview is retained as an audit record and does not use an attempt allowance.' : 'Great work! Your answers are safely saved and available to the administrator.'}</p>{exam.attempt.questions.length > 0 && <div className="mt-8 space-y-4">{exam.attempt.questions.map((question, index) => <article key={question.id} className="rounded-2xl border border-[#ead8c2] bg-white p-5"><h2 className="font-medium text-[#33241b]">{index + 1}. {question.prompt}</h2><div className="mt-3 text-sm text-[#624a3a]"><span className="font-semibold">Your answer:</span> {question.selectedAnswers.length ? question.selectedAnswers.map((answer) => answerLabel(question, answer)).join(', ') : 'No answer'}</div>{question.correctAnswers && <div className="mt-2 text-sm text-[#00754a]"><span className="font-semibold">Correct answer:</span> {question.correctAnswers.map((answer) => answerLabel(question, answer)).join(', ')}</div>}{question.explanation && <p className="mt-3 text-sm leading-6 text-[#80634f]">{question.explanation}</p>}</article>)}</div>}{!exam.attempt.isPreview && <button type="button" onClick={exam.startAnother} className="mt-8 rounded-xl border border-[#d3b18a] px-4 py-2.5 text-sm font-semibold text-[#68452d]">Start another allowed attempt</button>}</section></div></main>
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
  const answerFor = (question: PublicAttemptQuestion): string[] => {
    if (question.type !== 'short_text') return question.selectedAnswers;
    const value = (shortAnswers[question.id] ?? '').trim();
    return value ? [value] : [];
  };
  const goToNextQuestion = async () => {
    if (!current.timedOut && !await exam.saveAnswer(current.id, answerFor(current))) return;
    primeSound();
    playNext();
    setQuestionIndex((index) => Math.min(questions.length - 1, index + 1));
  };
  const submitFinal = async () => {
    primeSound();
    for (const question of questions) {
      if (question.type !== 'short_text' || question.timedOut) continue;
      const answer = answerFor(question);
      if (answer.join('\u0000') === question.selectedAnswers.join('\u0000')) continue;
      if (!await exam.saveAnswer(question.id, answer)) return;
    }
    const completed = await exam.submit();
    if (completed) setConfirmingSubmit(false);
  };

  return (
    <main className={`relative min-h-screen overflow-hidden ${autumnBackground}`}>
      <AutumnBackdrop />
      <header className="sticky top-0 z-20 border-b border-[#ddc6aa] bg-[#fffaf1]/95 px-5 py-3 backdrop-blur"><div className="mx-auto flex max-w-4xl items-center justify-between gap-3"><div className="hidden sm:block"><ExamSponsorBrand compact /></div><div className="min-w-0 flex-1 sm:text-center"><h1 className="truncate text-sm font-bold text-[#33241b]">{exam.attempt.title}</h1><p className="mt-0.5 text-xs text-[#8a6951]">{exam.attempt.isPreview ? `Admin preview · ${exam.attempt.previewedByEmail}` : exam.attempt.oneQuestionAtATime ? `Question ${safeQuestionIndex + 1} of ${questions.length}` : 'All questions'} · {answeredCount} answered</p></div><div className="hidden md:block"><SyncChip status={exam.syncStatus} count={exam.unsyncedCount} onRetry={exam.retrySync} /></div><SoundChip enabled={soundEnabled} onToggle={toggleSound} /><div className={`rounded-xl px-3 py-2 font-mono text-base font-bold sm:px-4 sm:text-lg ${exam.attempt.remainingSeconds < 120 ? 'bg-red-50 text-red-700' : 'bg-[#2c1d17] text-[#fff5e7]'}`}>{formatTime(exam.attempt.remainingSeconds)}</div></div></header>
      <div className="relative z-[1] mx-auto max-w-4xl px-5 py-7">
        <section className="relative mb-5 overflow-hidden rounded-[1.6rem] border border-[#7c3a14] bg-[linear-gradient(110deg,#1d0d08_0%,#32170d_58%,#28160e_100%)] px-6 py-5 text-white shadow-[0_16px_36px_rgba(66,33,15,.16)] sm:px-8">
          <AutumnHeroBranches />
          <div className="relative flex items-center justify-between gap-6">
            <div className="min-w-0 max-w-2xl"><div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ef8a35]">Graded exam</div><h2 className="mt-2 truncate text-xl font-bold sm:text-2xl">{exam.attempt.title}</h2>{exam.attempt.description && <p className="mt-1 truncate text-xs text-[#ead1bf]">{exam.attempt.description}</p>}<div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold"><span className="rounded-full bg-white/10 px-2.5 py-1">{exam.attempt.durationMinutes} minutes</span><span className="rounded-full bg-white/10 px-2.5 py-1">{questions.length} questions</span>{exam.attempt.preventFocusLoss && <span className="rounded-full bg-[#d97706]/25 px-2.5 py-1 text-[#ffd28c]">Focus lock on</span>}</div></div>
            <StoreNineCats compact />
          </div>
        </section>
        {secondsUntilEnd !== null && secondsUntilEnd <= 1_800 && <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-medium ${secondsUntilEnd > 0 ? 'border-orange-300 bg-orange-50 text-orange-900' : 'border-red-300 bg-red-50 text-red-800'}`}>{secondsUntilEnd > 0 ? <>The public response window closes in <strong className="font-mono">{formatCountdown(secondsUntilEnd)}</strong>. Your current attempt remains saved as you work.</> : <>The public response window has closed to new attempts. Finish and submit this in-progress attempt now.</>}</div>}
        {exam.unsyncedCount > 0 && <div className={`mb-5 flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${exam.syncStatus === 'error' || exam.syncStatus === 'offline' ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-sky-200 bg-sky-50 text-sky-950'}`} role="status" aria-live="polite"><div><strong>{exam.unsyncedCount} answer{exam.unsyncedCount === 1 ? '' : 's'} saved on this device.</strong> {exam.syncStatus === 'saving' ? 'Sending to the server now.' : exam.syncStatus === 'offline' ? 'You can keep answering; synchronization resumes when you reconnect.' : exam.syncStatus === 'error' ? 'The server has not accepted the answer yet.' : 'The server is temporarily unavailable; retrying automatically.'} Final submission stays locked until all answers are confirmed by the server.</div><button type="button" onClick={exam.retrySync} className="shrink-0 rounded-xl border border-current px-3 py-2 text-xs font-bold">Retry now</button></div>}
        <div className="mb-5 h-2 overflow-hidden rounded-full bg-[#eadac7]"><div className="h-full rounded-full bg-gradient-to-r from-[#b95f2a] to-[#e49b45] transition-all" style={{ width: `${exam.attempt.oneQuestionAtATime ? ((safeQuestionIndex + 1) / questions.length) * 100 : (answeredCount / questions.length) * 100}%` }} /></div>
        <div className="space-y-5">{displayedQuestions.map(({ question, index }) => <PublicQuestionCard key={question.id} question={question} number={index + 1} shortValue={shortAnswers[question.id] ?? ''} saving={exam.savingQuestionId === question.id} onShortChange={(value) => { setShortAnswers((answers) => ({ ...answers, [question.id]: value })); if (!question.timedOut) void exam.saveAnswer(question.id, value.trim() ? [value.trim()] : []); }} onSaveShort={() => { if (!question.timedOut) void exam.saveAnswer(question.id, (shortAnswers[question.id] ?? '').trim() ? [(shortAnswers[question.id] ?? '').trim()] : []); }} onChoice={(value) => setChoice(question, value)} />)}</div>
        {exam.error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exam.error}</div>}
        {exam.attempt.oneQuestionAtATime ? <div className="mt-5 flex items-center justify-between gap-3"><button type="button" onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))} disabled={safeQuestionIndex === 0} className="rounded-xl border border-[#d76c32] bg-[#fffdf8] px-5 py-2.5 text-sm font-semibold text-[#b55224] disabled:opacity-40">Previous</button>{safeQuestionIndex < questions.length - 1 ? <button type="button" onClick={() => void goToNextQuestion()} className="rounded-xl bg-[#d64e00] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-[#b84a18]/20">Save &amp; next</button> : <button type="button" onClick={() => { primeSound(); setConfirmingSubmit(true); }} disabled={exam.loading} className="rounded-xl bg-[#00754a] px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50">Submit exam</button>}</div> : <div className="mt-6 flex justify-end"><button type="button" onClick={() => { primeSound(); setConfirmingSubmit(true); }} disabled={exam.loading} className="rounded-xl bg-[#00754a] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">Submit exam</button></div>}
      </div>
      {confirmingSubmit && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#21140f]/70 p-5" role="dialog" aria-modal="true" aria-labelledby="submit-exam-title"><section className="w-full max-w-md rounded-3xl border border-[#e4c7a3] bg-[#fffdf8] p-7 shadow-2xl"><h2 id="submit-exam-title" className="text-xl font-semibold text-[#2f2118]">Submit this exam?</h2><p className="mt-3 text-sm leading-6 text-[#705746]">The exam will complete only after your latest answers are successfully saved on the server.</p>{exam.unsyncedCount > 0 && <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"><strong>{exam.unsyncedCount} answer{exam.unsyncedCount === 1 ? '' : 's'} still syncing.</strong> Your work is safe on this device. This dialog will stay open if synchronization cannot finish.</div>}{exam.error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exam.error}</div>}<div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setConfirmingSubmit(false)} disabled={exam.loading} className="rounded-xl border border-[#d3b18a] px-4 py-2.5 text-sm font-semibold text-[#68452d] disabled:opacity-50">Keep reviewing</button><button type="button" onClick={() => void submitFinal()} disabled={exam.loading} className="rounded-xl bg-[#00754a] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{exam.loading ? (exam.unsyncedCount > 0 ? 'Syncing answers…' : 'Submitting…') : exam.unsyncedCount > 0 ? `Sync ${exam.unsyncedCount} & submit` : 'Submit exam'}</button></div></section></div>}
    </main>
  );
}
