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
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Question {number}</span>
        <span className="text-xs text-slate-500">{question.points} point{question.points === 1 ? '' : 's'}</span>
      </div>
      <h2 className="mt-4 whitespace-pre-wrap text-xl font-medium leading-8 text-slate-950">{question.prompt}</h2>

      {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
        <div className="mt-6 space-y-3">
          {question.options.map((option) => (
            <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${question.selectedAnswers.includes(option.id) ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'}`}>
              <input type={question.type === 'multiple_choice' ? 'checkbox' : 'radio'} name={question.id} checked={question.selectedAnswers.includes(option.id)} onChange={() => onChoice(option.id)} className="mt-0.5 h-4 w-4" />
              <span className="text-sm leading-6 text-slate-800">{option.label}</span>
            </label>
          ))}
        </div>
      )}

      {question.type === 'true_false' && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {['true', 'false'].map((value) => (
            <button key={value} type="button" onClick={() => onChoice(value)} className={`rounded-xl border p-4 text-sm font-semibold capitalize ${question.selectedAnswers[0] === value ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-700'}`}>{value}</button>
          ))}
        </div>
      )}

      {question.type === 'short_text' && (
        <textarea value={shortValue} onChange={(event) => onShortChange(event.target.value)} onBlur={onSaveShort} rows={5} placeholder="Type your answer…" className="mt-6 w-full rounded-xl border border-slate-300 px-4 py-3 leading-6" />
      )}

      <div className="mt-3 h-5 text-xs text-slate-500">{saving ? 'Saving answer…' : question.selectedAnswers.length > 0 ? 'Answer saved' : ''}</div>
    </section>
  );
}
