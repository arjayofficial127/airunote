'use client';

import type { PublicAttemptQuestion } from '@/lib/api/exams';

interface PublicQuestionCardProps {
  question: PublicAttemptQuestion;
  number: number;
  shortValue: string;
  saving: boolean;
  onShortChange: (value: string) => void;
  onSaveShort: () => void;
  onChoice: (value: string) => void;
}

export function PublicQuestionCard({ question, number, shortValue, saving, onShortChange, onSaveShort, onChoice }: PublicQuestionCardProps) {
  const timed = question.maxTimeSeconds !== null && question.timeRemainingSeconds !== null;
  const timerRatio = timed ? Math.max(0, Math.min(1, question.timeRemainingSeconds! / question.maxTimeSeconds!)) : 1;
  const timerDanger = timed && question.timeRemainingSeconds! <= Math.min(10, Math.ceil(question.maxTimeSeconds! * 0.2));
  const disabled = question.timedOut;

  return (
    <section className="rounded-[2rem] border border-[var(--exam-color-e5c79f)] bg-[var(--exam-color-fffdf8)] p-6 shadow-[0_18px_50px_rgba(81,49,24,0.1)] sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--exam-color-b65b28)]">Question {number}</span>
          <div className="mt-1 text-xs text-[var(--exam-color-947056)]">{question.points} point{question.points === 1 ? '' : 's'}</div>
        </div>
        {timed && (
          <div className="flex items-center gap-3">
            <div className="text-right"><div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--exam-color-9b765a)]">Question time</div><div className={`mt-0.5 font-mono text-sm font-bold ${timerDanger ? 'text-red-700' : 'text-[var(--exam-color-7a3f20)]'}`}>{Math.floor(question.timeRemainingSeconds! / 60).toString().padStart(2, '0')}:{(question.timeRemainingSeconds! % 60).toString().padStart(2, '0')}</div></div>
            <div className="grid h-12 w-12 place-items-center rounded-full" style={{ background: `conic-gradient(${timerDanger ? 'var(--exam-color-dc2626)' : 'var(--exam-color-d97706)'} ${timerRatio * 360}deg, var(--exam-color-f0dfc8) 0deg)` }}><div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--exam-color-fffdf8)] text-[10px] font-bold text-[var(--exam-color-7d5132)]">{Math.ceil(timerRatio * 100)}%</div></div>
          </div>
        )}
      </div>
      <h2 className="mt-4 whitespace-pre-wrap text-xl font-semibold leading-8 text-[var(--exam-color-2f2118)]">{question.prompt}</h2>

      {question.timedOut && <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">Time ended for this question. Your last answer was saved and the response is now locked.</div>}

      {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
        <div className="mt-6 space-y-3">
          {question.options.map((option) => (
            <label key={option.id} className={`flex items-start gap-3 rounded-2xl border p-4 transition ${disabled ? 'cursor-not-allowed opacity-65' : 'cursor-pointer'} ${question.selectedAnswers.includes(option.id) ? 'border-[var(--exam-color-d97838)] bg-[var(--exam-color-fff3df)] ring-2 ring-[var(--exam-color-f4d2ab)]' : 'border-[var(--exam-color-ead8c2)] bg-white hover:border-[var(--exam-color-d8ae7a)]'}`}>
              <input disabled={disabled} type={question.type === 'multiple_choice' ? 'checkbox' : 'radio'} name={question.id} checked={question.selectedAnswers.includes(option.id)} onChange={() => onChoice(option.id)} className="mt-0.5 h-4 w-4 accent-[var(--exam-color-b85d2b)]" />
              <span className="text-sm leading-6 text-[var(--exam-color-49372b)]">{option.label}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === 'true_false' && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {['true', 'false'].map((value) => (
            <button disabled={disabled} key={value} type="button" onClick={() => onChoice(value)} className={`rounded-xl border p-4 text-sm font-semibold capitalize disabled:cursor-not-allowed disabled:opacity-60 ${question.selectedAnswers[0] === value ? 'border-[var(--exam-color-d97838)] bg-[var(--exam-color-fff3df)] text-[var(--exam-color-7a3f20)]' : 'border-[var(--exam-color-ead8c2)] bg-white text-[var(--exam-color-49372b)]'}`}>{value}</button>
          ))}
        </div>
      )}

      {question.type === 'short_text' && (
        <textarea disabled={disabled} value={shortValue} onChange={(event) => onShortChange(event.target.value)} onBlur={onSaveShort} rows={5} placeholder="Type your answer…" className="mt-6 w-full rounded-xl border border-[var(--exam-color-d9bea0)] bg-white px-4 py-3 leading-6 text-[var(--exam-color-49372b)] outline-none focus:border-[var(--exam-color-d97838)] focus:ring-2 focus:ring-[var(--exam-color-f4d2ab)] disabled:bg-[var(--exam-color-f6eee4)]" />
      )}

      <div className="mt-3 h-5 text-xs text-[var(--exam-color-947056)]">{saving ? 'Saving answer…' : question.timedOut ? 'Question closed' : question.selectedAnswers.length > 0 ? 'Answer saved' : timed ? 'Your last answer will be saved when time expires.' : ''}</div>
    </section>
  );
}
