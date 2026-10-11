'use client';

import { ExamAppearanceProvider, useExamAppearance, useExamPreview, useExamAssetUrl } from './ExamAppearanceProvider';
import { ExamTopBanner } from './ExamTopBanner';
import { CreatorEntryReveal, CreatorCompletionGift, CreatorBotanicalFrame } from './CreatorEntryReveal';
import { readAppearance } from '@/lib/exam-appearance';
import { FormEvent, useEffect, useRef, useState } from 'react';
import type { PublicAttemptQuestion, PublicExamOverview } from '@/lib/api/exams';
import { AutumnBackdrop, AutumnHeroBranches } from './AutumnDecorations';
import { ExamSponsorBrand, StoreNineCats } from './ExamSponsorBrand';
import { PublicQuestionCard } from './PublicQuestionCard';
import { useExamSounds } from './useExamSounds';
import { usePublicExam, type ExamSyncStatus } from './usePublicExam';

interface PublicExamPageProps { publicId: string; codedGrant?: string }

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

const autumnBackground = 'exam-page-background';

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

function ExamInstructions({ description }: { description: string | null }) {
  const { instructions, renderer } = useExamAppearance();
  const introImageUrl = useExamAssetUrl(instructions?.introImage ?? null);
  const [failedIntroImage, setFailedIntroImage] = useState<string>();
  const ribbonImage = instructions?.introImage?.source === 'builtin' && instructions.introImage.assetId === 'wrapped-in-joy-ribbon-text';
  const imageSize = instructions?.introImageSize ?? (ribbonImage ? 'medium' : 'large');
  const imageWidth = imageSize === 'custom' ? Math.max(20, Math.min(100, instructions?.introImageWidth ?? 72)) : { xs: 40, small: 55, medium: 72, large: 100 }[imageSize];
  const fonts = { inherit: 'inherit', sans: 'Arial, sans-serif', serif: 'Georgia, serif', mono: 'ui-monospace, monospace', script: '"Brush Script MT", "Segoe Script", cursive', flourish: 'inherit' };
  if (!introImageUrl && !description && !instructions?.intro && !instructions?.title && !instructions?.secondaryTitle && !instructions?.secondaryBody) return null;
  return <div className="creator-instructions space-y-5">
    {renderer !== 'creator' && (instructions?.introMode === 'image' && introImageUrl && introImageUrl !== failedIntroImage ? <img src={introImageUrl} alt={instructions.introImageAlt || instructions.intro || 'Opening text'} onError={() => setFailedIntroImage(introImageUrl)} className="instruction-image block h-auto w-full max-w-lg object-contain" data-ribbon={ribbonImage} style={{ width: `${imageWidth}%`, maxWidth: `${480 * imageWidth / 100}px` }} /> : instructions?.intro && <p className="instruction-intro" data-font={instructions.introFont} style={{ fontFamily: fonts[instructions.introFont ?? 'inherit'] }}>{instructions.introFont === 'flourish' ? <><span className="instruction-wild-initial">{Array.from(instructions.intro)[0]}</span>{Array.from(instructions.intro).slice(1).join('')}</> : instructions.intro}</p>)}
      <div className="entry-instructions-body">
      {instructions?.title && <h2 className="mb-3 text-lg font-bold">{instructions.title}</h2>}
      {description && <p>{description}</p>}
      </div>
    {(instructions?.secondaryTitle || instructions?.secondaryBody) && <div className="border-t border-[var(--exam-color-e4c7a3)] pt-5">
      {instructions.secondaryTitle && <h2 className="mb-3 text-base font-bold">{instructions.secondaryTitle}</h2>}
      {instructions.secondaryBody && <p>{instructions.secondaryBody}</p>}
    </div>}
  </div>;
}

function ExamContext({ title }: { title: string }) {
  const appearance = useExamAppearance();
  return <div className="exam-context">
    {appearance.headerLabel && <p className="exam-context-label text-[9px] font-bold leading-normal tracking-[0.06em]">{appearance.headerLabel}</p>}
    <p className="exam-context-title">{title}</p>
  </div>;
}

function ScheduledExamNotice({ overview, state, seconds }: { overview: PublicExamOverview; state: 'upcoming' | 'ended' | 'unavailable'; seconds?: number }) {
  const upcoming = state === 'upcoming';
  const appearance = useExamAppearance();
  if (appearance.renderer === 'creator' && appearance.artwork.visible && state !== 'unavailable') return (
    <main className={`exam-entry-page exam-schedule-page relative min-h-screen overflow-hidden px-5 py-8 sm:py-12 ${autumnBackground}`}>
      <AutumnBackdrop />
      <div className="exam-entry-shell relative z-[1] mx-auto max-w-4xl">
        <div className="exam-entry-brand exam-brand-bar mb-6"><ExamSponsorBrand /></div>
        <section className="exam-entry-card overflow-hidden rounded-[2rem] border border-[var(--exam-color-dcc3a5)] bg-[var(--exam-color-fffdf8)] shadow-[0_28px_80px_rgba(73,43,22,0.18)]">
          <CreatorEntryReveal title={overview.title} notice={{ state, countdown: formatCountdown(seconds ?? 0), scheduledFor: overview.startsAt ? formatScheduleDate(overview.startsAt) : 'the scheduled opening time' }} />
        </section>
      </div>
    </main>
  );
  return (
    <main className={`min-h-screen px-5 py-10 ${autumnBackground}`}>
      <AutumnBackdrop />
      <div className="relative z-[1] mx-auto max-w-3xl">
        <div className="mb-6"><ExamSponsorBrand /></div>
        <section className="exam-entry-card overflow-hidden rounded-[2rem] border border-[var(--exam-color-dcc3a5)] bg-[var(--exam-color-fffdf8)] shadow-[0_28px_80px_rgba(73,43,22,0.16)]">
          <div className="relative overflow-hidden bg-[var(--exam-color-2c1d17)] px-7 py-8 text-[var(--exam-header-text)] sm:px-10">
            <AutumnHeroBranches />
            <div className="relative"><div className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--exam-color-f4b36f)]">{appearance.headerLabel}</div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">{overview.title}</h1>
            </div>
          </div>
          <div className="p-7 text-center sm:p-10">
            <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full text-2xl ${upcoming ? 'bg-[var(--exam-color-fff0d5)] text-[var(--exam-color-a94e21)]' : 'bg-[var(--exam-color-eee4d9)] text-[var(--exam-color-725441)]'}`}>{upcoming ? '◷' : '—'}</div>
            <h2 className="mt-5 text-2xl font-bold text-[var(--exam-color-2f2118)]">{upcoming ? 'You’re early — the exam opens soon' : state === 'ended' ? 'The response window has ended' : 'This exam isn’t open right now'}</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--exam-color-705746)]">{upcoming ? 'You can keep this page open. The start form will appear automatically when the countdown reaches zero.' : state === 'ended' ? 'New attempts are no longer being accepted. If you believe you should still have access, please contact the exam administrator.' : 'The administrator may still be preparing this exam or may have paused responses. Please check the link again later or contact them for access.'}</p>
            {upcoming && overview.startsAt && <><div className="mx-auto mt-7 max-w-md rounded-2xl border border-[var(--exam-color-e5c08a)] bg-[var(--exam-color-fff8e8)] px-5 py-5"><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--exam-color-9a6b45)]">Opens in</div><div className="mt-2 font-mono text-3xl font-black tracking-tight text-[var(--exam-color-8d431e)]" aria-live="polite">{formatCountdown(seconds ?? 0)}</div></div><p className="mt-4 text-xs font-semibold text-[var(--exam-color-8c6a51)]">Scheduled for {formatScheduleDate(overview.startsAt)}</p></>}
          </div>
        </section>
      </div>
    </main>
  );
}

export function PublicExamPage({ publicId, codedGrant }: PublicExamPageProps) {
  const exam = usePublicExam(publicId, codedGrant);
  return <ExamAppearanceProvider config={readAppearance(exam.attempt?.appearance ?? exam.overview?.appearance)}><ExamContent exam={exam} /></ExamAppearanceProvider>;
}

export function ExamContent({ exam, previewInstructions = false, onPreviewStart }: { exam: ReturnType<typeof usePublicExam>; previewInstructions?: boolean; onPreviewStart?: () => void }) {
  const appearance = useExamAppearance();
  const preview = useExamPreview();
  const { activateQuestion, expireQuestion } = exam;
  const { primeSound, playNext, playCelebration } = useExamSounds();
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
    if (preview) { onPreviewStart?.(); return; }
    primeSound();
    void exam.start({ respondentName: name, respondentEmail: email, respondentIdentifier: identifier });
  };

  if (exam.loading && !exam.attempt) return <div className={`flex min-h-screen items-center justify-center ${autumnBackground} text-sm font-medium text-[var(--exam-color-7d5132)]`}>Preparing your exam…</div>;
  if (!exam.overview) return <div className={`flex min-h-screen items-center justify-center p-6 ${autumnBackground}`}><div className="max-w-md rounded-3xl border border-red-200 bg-[var(--exam-color-fffdf8)] p-8 text-center shadow-xl"><h1 className="text-xl font-semibold text-[var(--exam-color-2f2118)]">Exam unavailable</h1><p className="mt-2 text-sm text-red-700">{exam.error || 'This link is invalid or currently unavailable.'}</p></div></div>;

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
    <main className={`exam-entry-page relative min-h-screen overflow-hidden px-5 py-8 sm:py-12 ${autumnBackground}`}>
      <AutumnBackdrop />
      <div className="pointer-events-none absolute -left-16 top-36 h-44 w-44 rounded-full border-[34px] border-[color:var(--exam-color-d97736-10)]" />
      <div className="pointer-events-none absolute -right-12 bottom-12 h-56 w-56 rotate-12 rounded-[45%] bg-[color:var(--exam-color-1e3932-5)]" />
      <div className="exam-entry-shell relative z-[1] mx-auto max-w-4xl">
        <div className="exam-entry-brand exam-brand-bar mb-6"><ExamSponsorBrand /></div>
        <section className="exam-entry-card overflow-hidden rounded-[2rem] border border-[var(--exam-color-dcc3a5)] bg-[var(--exam-color-fffdf8)] shadow-[0_28px_80px_rgba(73,43,22,0.18)]">
          <CreatorEntryReveal title={exam.overview.title} initiallyOpen={preview && previewInstructions}>
          {appearance.renderer === 'creator' ? <ExamTopBanner title={exam.overview.title} /> : <div className="exam-entry-hero relative bg-[var(--exam-color-2c1d17)] px-7 py-8 text-[var(--exam-header-text)] sm:px-10 sm:py-10">
            <AutumnHeroBranches />
            <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_20%_30%,var(--exam-color-d97838)_0,transparent_25%),radial-gradient(circle_at_85%_10%,var(--exam-color-00754a)_0,transparent_24%)]" />
            <div className="exam-entry-composition relative flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1 max-w-xl">
                <div className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--exam-color-f4b36f)]">{appearance.headerLabel}</div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{exam.overview.title}</h1>
                {!appearance.instructions && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--exam-color-ead8c7)]">{exam.overview.description}</p>}
                <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-white/10 px-3 py-1.5">{exam.overview.durationMinutes} minutes</span>
                  <span className="rounded-full bg-white/10 px-3 py-1.5">{exam.overview.questionCount} question{exam.overview.questionCount === 1 ? '' : 's'}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1.5">Up to {exam.overview.maxAttempts} takes</span>
                  {exam.overview.preventFocusLoss && <span className="rounded-full bg-[color:var(--exam-color-d97706-25)] px-3 py-1.5 text-[var(--exam-color-ffd28c)]">Focus lock on</span>}
                </div>
              </div>
              <StoreNineCats />
            </div>
          </div>}
          {(appearance.renderer === 'creator' || appearance.instructions) && <ExamInstructions description={exam.overview.description} />}
          {appearance.renderer === 'creator' && <div className="entry-exam-facts" aria-label="Exam details"><span>{exam.overview.durationMinutes} minutes</span><span>{exam.overview.questionCount} question{exam.overview.questionCount === 1 ? '' : 's'}</span><span>Up to {exam.overview.maxAttempts} takes</span></div>}
          <form onSubmit={submitIdentity} className="entry-identity-form p-7 sm:p-10"><fieldset className="min-w-0 space-y-5">
            <div><h2 className="text-lg font-bold text-[var(--exam-color-33241b)]">Your details</h2><p className="mt-1 text-sm text-[var(--exam-color-705746)]">Your timer starts when you select Start exam.</p></div>
            {exam.overview.preventFocusLoss && <div className="rounded-2xl border border-[var(--exam-color-e9b95f)] bg-[var(--exam-color-fff6dc)] px-4 py-3 text-sm leading-6 text-[var(--exam-color-754116)]"><strong>Before you begin:</strong> moving to another tab, minimizing, or losing window focus will end the attempt. You will need to contact the administrator for a continue link.</div>}
            {secondsUntilEnd !== null && secondsUntilEnd > 0 && secondsUntilEnd <= 1_800 && <div className="rounded-2xl border border-orange-300 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-900"><strong>The response window closes soon:</strong> {formatCountdown(secondsUntilEnd)} remaining, until {formatScheduleDate(exam.overview.endsAt!)}. Start only if you have enough time to finish.</div>}
            <label className="block text-sm font-semibold text-[var(--exam-color-49372b)]">Full name *<input required value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--exam-color-d9bea0)] bg-white px-4 py-3 outline-none focus:border-[var(--exam-color-d97838)] focus:ring-2 focus:ring-[var(--exam-color-f4d2ab)]" /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-[var(--exam-color-49372b)]">Email {exam.overview.requireEmail ? '*' : '(optional)'}<input required={exam.overview.requireEmail} type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--exam-color-d9bea0)] bg-white px-4 py-3 outline-none focus:border-[var(--exam-color-d97838)] focus:ring-2 focus:ring-[var(--exam-color-f4d2ab)]" /></label>
              <label className="block text-sm font-semibold text-[var(--exam-color-49372b)]">Student / employee ID {exam.overview.requireIdentifier ? '*' : '(optional)'}<input required={exam.overview.requireIdentifier} value={identifier} onChange={(event) => setIdentifier(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--exam-color-d9bea0)] bg-white px-4 py-3 outline-none focus:border-[var(--exam-color-d97838)] focus:ring-2 focus:ring-[var(--exam-color-f4d2ab)]" /></label>
            </div>
            {exam.error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exam.error}</p>}
            <div className="entry-start-action"><button type="submit" disabled={exam.loading} className="w-full rounded-xl bg-[var(--exam-color-b95f2a)] px-5 py-3.5 text-sm font-bold text-[var(--exam-primary-text)] shadow-lg shadow-[color:var(--exam-color-b95f2a-20)] transition hover:bg-[var(--exam-color-99491f)] disabled:opacity-50">{exam.loading ? 'Starting…' : 'Start exam'}</button></div>
            <ExamFooter />
          </fieldset></form>
          </CreatorEntryReveal>
        </section>
      </div>
    </main>
  );

  if (['terminated', 'timed_out', 'abandoned', 'void'].includes(exam.attempt.status)) {
    const paused = exam.attempt.status === 'terminated';
    const timedOut = exam.attempt.status === 'timed_out';
    return <main className={`exam-terminal-page terminal-refined relative min-h-screen ${autumnBackground}`}>
      <AutumnBackdrop />
      <section className="terminal-card relative z-[1]" aria-labelledby="terminal-title">
        {appearance.renderer === 'creator' ? <ExamTopBanner title={exam.attempt.title} /> : <div className="terminal-context"><ExamSponsorBrand /><ExamContext title={exam.attempt.title} /></div>}
        <div className="terminal-body">
          <div className="terminal-icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paused ? <><rect x="7" y="5" width="3" height="14" rx="1" /><rect x="14" y="5" width="3" height="14" rx="1" /></> : <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}</svg></div>
          <p className="terminal-eyebrow">{paused ? 'Focus protection' : timedOut ? 'Time limit reached' : 'Attempt closed'}</p>
          <h1 id="terminal-title">{paused ? 'Your attempt is paused' : timedOut ? 'Time is up' : exam.attempt.status === 'void' ? 'This attempt was marked void' : 'This attempt is no longer active'}</h1>
          <p className="terminal-description">{paused ? 'The exam window lost focus. Your saved answers remain on record.' : 'Your saved answers remain on record.'}</p>
          <div className="terminal-next-step"><h2>What happens next?</h2><p>{paused ? 'Contact your exam administrator for a continue link to resume this attempt.' : 'Contact your exam administrator if you need help or permission to retake.'}</p></div>
          <p className="terminal-attempt">Attempt #{exam.attempt.attemptNumber}{exam.attempt.isPreview ? ` · ${exam.attempt.previewedByRole === 'PreviewCoded' ? 'Preview Coded' : 'Admin Attempt'}` : ''}</p>
          {(paused || exam.attempt.isPreview) && <button type="button" onClick={exam.startAnother} className="terminal-secondary">{exam.attempt.isPreview ? 'Try another preview' : 'Different respondent'}</button>}
        </div>
      </section>
    </main>;
  }

  if (exam.attempt.status === 'completed') return (
    <main className={`exam-completion-page relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-10 ${autumnBackground}`}>
      <AutumnBackdrop />
      <div className="completion-layout relative z-[1] mx-auto max-w-2xl">
        {appearance.renderer === 'creator' ? <div className="completion-banner"><ExamTopBanner title={exam.attempt.title} /></div> : <><div className="mb-5"><ExamSponsorBrand /></div><div className="mb-5 px-1"><ExamContext title={exam.attempt.title} /></div></>}
        <section className="completion-receipt" data-creator={appearance.renderer === 'creator'}>
          {exam.attempt.isPreview && <div className="border-b border-violet-200 bg-violet-50 px-5 py-3 text-xs font-semibold text-violet-800">{exam.attempt.previewedByRole === 'PreviewCoded' ? 'Preview Coded' : 'Admin Attempt'} · {exam.attempt.previewedByEmail} · excluded from respondent statistics</div>}
          <div className="completion-celebration">
            <CreatorBotanicalFrame corners={['bottom']} />
            <div className="completion-art">
              <CreatorCompletionGift />
              {appearance.renderer !== 'creator' && appearance.decorations.completion && <div aria-hidden="true" className="mb-4 text-5xl">{appearance.renderer === 'holiday' ? '🎁' : '🍂'}</div>}

            </div>
            {(appearance.completionEyebrow ?? '') && <p className="completion-eyebrow">{appearance.completionEyebrow ?? ''}</p>}
            <h1 className="completion-title">{appearance.completionTitle ?? 'END OF EXAM'}</h1>
            <div className="completion-confirmation" role="status"><span aria-hidden="true">✓</span><span>{exam.attempt.isPreview ? 'Preview recorded' : 'Answers submitted'}</span></div>
            <p className="completion-message">{exam.attempt.isPreview ? 'Your answers and grade are saved in PreviewAttempts. Preview attempts are unlimited.' : (appearance.completionMessage || 'Thank you for giving it your best. Your answers are safely saved.').replace(/^END OF EXAM\s*[—–-]\s*/i, '')}</p>
          </div>
        </section>
        {exam.attempt.questions.length > 0 && <details className="completion-review group">
          <summary className="completion-review-toggle flex cursor-pointer list-none items-center justify-center gap-3 font-semibold">
            <span><span className="group-open:hidden">Review your answers</span><span className="hidden group-open:inline">Hide your answers</span></span>
            <svg className="shrink-0 transition-transform group-open:rotate-180" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </summary>
          <div className="space-y-3 border-t border-[var(--exam-color-ead8c2)] p-4">{exam.attempt.questions.map((question, index) => <article key={question.id} className="rounded-2xl border border-[var(--exam-color-ead8c2)] bg-white p-5"><h2 className="font-medium text-[var(--exam-color-33241b)]">{index + 1}. {question.prompt}</h2><div className="mt-3 text-sm text-[var(--exam-color-624a3a)]"><span className="font-semibold">Your answer:</span> {question.selectedAnswers.length ? question.selectedAnswers.map((answer) => answerLabel(question, answer)).join(', ') : 'No answer'}</div>{question.correctAnswers && <div className="mt-2 text-sm text-[var(--exam-color-00754a)]"><span className="font-semibold">Correct answer:</span> {question.correctAnswers.map((answer) => answerLabel(question, answer)).join(', ')}</div>}{question.explanation && <p className="mt-3 text-sm leading-6 text-[var(--exam-color-80634f)]">{question.explanation}</p>}</article>)}</div>
        </details>}
        {(exam.attempt.isPreview || (availability === 'open' && exam.attempt.attemptNumber < exam.overview.maxAttempts)) && <div className="completion-retry"><button type="button" onClick={exam.startAnother} className="completion-retry-button">Take another attempt <span aria-hidden="true">→</span></button><p className="mt-2 text-center text-xs text-[var(--exam-color-705746)]">{exam.attempt.isPreview ? 'Unlimited preview attempts' : `${exam.overview.maxAttempts - exam.attempt.attemptNumber} attempts remaining`}</p></div>}
      </div>
    </main>
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
    <main className={`exam-question-page relative min-h-screen overflow-hidden ${autumnBackground}`}>
      <AutumnBackdrop />
      <div className="relative z-[1]">
        <header className="exam-question-header overflow-hidden border-b border-[var(--exam-color-ddc6aa)] bg-[var(--exam-color-fffdf8)] text-[var(--exam-color-33241b)] shadow-sm">
          {appearance.renderer === 'creator' && <ExamTopBanner title={exam.attempt.title} />}
          <div className="exam-status-strip mx-auto max-w-4xl px-4 py-3 sm:px-5">
          {appearance.renderer !== 'creator' && <>{appearance.headerLabel && <p className="exam-context-label mb-1">{appearance.headerLabel}</p>}
          <h1 className="text-base font-bold leading-snug sm:text-lg">{exam.attempt.title}</h1></>}
          {exam.attempt.isPreview && <p className="mt-1 text-xs text-[var(--exam-color-8a6951)]">{exam.attempt.previewedByRole === 'PreviewCoded' ? 'Preview Coded' : 'Admin Attempt'} · {exam.attempt.previewedByEmail}</p>}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="exam-status-counts min-w-0 flex-1 text-xs leading-5 text-[var(--exam-color-8a6951)]">
              <p className="font-semibold">{exam.attempt.oneQuestionAtATime ? `Question ${safeQuestionIndex + 1} of ${questions.length}` : `${questions.length} questions`}</p>
              <p>{answeredCount} answered{exam.attempt.preventFocusLoss ? ' · Focus lock on' : ''}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              
              <div aria-label={`Time remaining: ${formatTime(exam.attempt.remainingSeconds)}`} data-urgent={exam.attempt.remainingSeconds < 120} className={`exam-status-timer rounded-xl px-3 py-2 font-mono text-base font-bold tabular-nums ${exam.attempt.remainingSeconds < 120 ? 'bg-red-50 text-red-700' : 'bg-[var(--exam-color-2c1d17)] text-[var(--exam-color-fff5e7)]'}`}>{formatTime(exam.attempt.remainingSeconds)}</div>
            </div>
          </div>
          <div role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answeredCount} aria-valuetext={`${answeredCount} of ${questions.length} answered`} className="exam-status-progress mt-3 h-2 overflow-hidden rounded-full bg-[var(--exam-color-eadac7)]">
            <div className="h-full rounded-full bg-[var(--exam-color-2c1d17)] transition-[width] duration-200" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
          </div>
          {exam.unsyncedCount > 0 && <div className="mt-2"><SyncChip status={exam.syncStatus} count={exam.unsyncedCount} onRetry={exam.retrySync} /></div>}
          </div>
        </header>
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-5 sm:py-5">
        {secondsUntilEnd !== null && secondsUntilEnd <= 1_800 && <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-medium ${secondsUntilEnd > 0 ? 'border-orange-300 bg-orange-50 text-orange-900' : 'border-red-300 bg-red-50 text-red-800'}`}>{secondsUntilEnd > 0 ? <>The public response window closes in <strong className="font-mono">{formatCountdown(secondsUntilEnd)}</strong>. Your current attempt remains saved as you work.</> : <>The public response window has closed to new attempts. Finish and submit this in-progress attempt now.</>}</div>}
        {exam.unsyncedCount > 0 && <div className={`mb-5 flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${exam.syncStatus === 'error' || exam.syncStatus === 'offline' ? 'border-amber-300 bg-amber-50 text-amber-950' : 'border-sky-200 bg-sky-50 text-sky-950'}`} role="status" aria-live="polite"><div><strong>{exam.unsyncedCount} answer{exam.unsyncedCount === 1 ? '' : 's'} saved on this device.</strong> {exam.syncStatus === 'saving' ? 'Sending to the server now.' : exam.syncStatus === 'offline' ? 'You can keep answering; synchronization resumes when you reconnect.' : exam.syncStatus === 'error' ? 'The server has not accepted the answer yet.' : 'The server is temporarily unavailable; retrying automatically.'} Final submission stays locked until all answers are confirmed by the server.</div><button type="button" onClick={exam.retrySync} className="shrink-0 rounded-xl border border-current px-3 py-2 text-xs font-bold">Retry now</button></div>}
        <div className="space-y-5">{displayedQuestions.map(({ question, index }) => <PublicQuestionCard key={question.id} question={question} number={index + 1} shortValue={shortAnswers[question.id] ?? ''} saving={exam.savingQuestionId === question.id} onShortChange={(value) => { setShortAnswers((answers) => ({ ...answers, [question.id]: value })); if (!question.timedOut) void exam.saveAnswer(question.id, value.trim() ? [value.trim()] : []); }} onSaveShort={() => { if (!question.timedOut) void exam.saveAnswer(question.id, (shortAnswers[question.id] ?? '').trim() ? [(shortAnswers[question.id] ?? '').trim()] : []); }} onChoice={(value) => setChoice(question, value)} />)}</div>
        {exam.error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exam.error}</div>}
        {exam.attempt.oneQuestionAtATime ? <div className="exam-question-navigation mt-5 flex flex-wrap items-center justify-between gap-3">{safeQuestionIndex > 0 && <button type="button" onClick={() => setQuestionIndex((index) => Math.max(0, index - 1))} className="rounded-xl border border-[var(--exam-color-d76c32)] bg-[var(--exam-color-fffdf8)] px-5 py-2.5 text-sm font-semibold text-[var(--exam-color-b55224)] disabled:opacity-40">Previous</button>}{safeQuestionIndex < questions.length - 1 ? <button type="button" onClick={() => void goToNextQuestion()} className="rounded-xl bg-[var(--exam-color-d64e00)] px-6 py-2.5 text-sm font-bold text-[var(--exam-primary-text)] shadow-md shadow-[color:var(--exam-color-b84a18-20)]">Save &amp; next</button> : <button type="button" onClick={() => { primeSound(); setConfirmingSubmit(true); }} disabled={exam.loading} className="rounded-xl bg-[var(--exam-color-00754a)] px-6 py-2.5 text-sm font-bold text-[var(--exam-primary-text)] disabled:opacity-50">Submit exam</button>}</div> : <div className="mt-6 flex justify-end"><button type="button" onClick={() => { primeSound(); setConfirmingSubmit(true); }} disabled={exam.loading} className="rounded-xl bg-[var(--exam-color-00754a)] px-6 py-3 text-sm font-bold text-[var(--exam-primary-text)] disabled:opacity-50">Submit exam</button></div>}
        </div>
      </div>
      {confirmingSubmit && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[color:var(--exam-color-21140f-70)] p-5" role="dialog" aria-modal="true" aria-labelledby="submit-exam-title"><section className="w-full max-w-md rounded-3xl border border-[var(--exam-color-e4c7a3)] bg-[var(--exam-color-fffdf8)] p-7 shadow-2xl"><h2 id="submit-exam-title" className="text-xl font-semibold text-[var(--exam-color-2f2118)]">Submit this exam?</h2><p className="mt-3 text-sm leading-6 text-[var(--exam-color-705746)]">The exam will complete only after your latest answers are successfully saved on the server.</p>{exam.unsyncedCount > 0 && <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"><strong>{exam.unsyncedCount} answer{exam.unsyncedCount === 1 ? '' : 's'} still syncing.</strong> Your work is safe on this device. This dialog will stay open if synchronization cannot finish.</div>}{exam.error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{exam.error}</div>}<div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={() => setConfirmingSubmit(false)} disabled={exam.loading} className="rounded-xl border border-[var(--exam-color-d3b18a)] px-4 py-2.5 text-sm font-semibold text-[var(--exam-color-68452d)] disabled:opacity-50">Keep reviewing</button><button type="button" onClick={() => void submitFinal()} disabled={exam.loading} className="rounded-xl bg-[var(--exam-color-00754a)] px-4 py-2.5 text-sm font-bold text-[var(--exam-primary-text)] disabled:opacity-50">{exam.loading ? (exam.unsyncedCount > 0 ? 'Syncing answers…' : 'Submitting…') : exam.unsyncedCount > 0 ? `Sync ${exam.unsyncedCount} & submit` : 'Submit exam'}</button></div></section></div>}
    </main>
  );
}

export function ExamFooter() { const { footer } = useExamAppearance(); return footer.visible && footer.text ? <p className="text-center text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--exam-color-9b765a)]">{footer.text}</p> : null; }
