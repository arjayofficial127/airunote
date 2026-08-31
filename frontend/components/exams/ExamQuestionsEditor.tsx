'use client';

import type { ExamQuestionInput, ExamQuestionType, ExamSectionInput } from '@/lib/api/exams';

interface ExamQuestionsEditorProps {
  questions: ExamQuestionInput[];
  sections: ExamSectionInput[];
  locked: boolean;
  onQuestionsChange: (questions: ExamQuestionInput[]) => void;
  onSectionsChange: (sections: ExamSectionInput[]) => void;
}

function newKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function optionReference(option: { id?: string; key?: string }): string {
  return option.id ?? option.key ?? '';
}

export function ExamQuestionsEditor({ questions, sections, locked, onQuestionsChange, onSectionsChange }: ExamQuestionsEditorProps) {
  const updateQuestion = (index: number, update: Partial<ExamQuestionInput>) => {
    onQuestionsChange(questions.map((question, questionIndex) => questionIndex === index ? { ...question, ...update } : question));
  };

  const addQuestion = () => onQuestionsChange([...questions, {
    type: 'single_choice', prompt: 'Untitled question', required: true, graded: false, points: 1,
    position: questions.length, pinned: false, correctAnswers: [],
    options: [{ key: newKey('option'), label: 'Option 1' }, { key: newKey('option'), label: 'Option 2' }],
  }]);

  const changeType = (index: number, type: ExamQuestionType) => {
    const options = type === 'single_choice' || type === 'multiple_choice'
      ? [{ key: newKey('option'), label: 'Option 1' }, { key: newKey('option'), label: 'Option 2' }]
      : [];
    updateQuestion(index, { type, options, correctAnswers: [] });
  };

  const toggleCorrect = (questionIndex: number, reference: string, multiple: boolean) => {
    const current = questions[questionIndex].correctAnswers ?? [];
    const next = current.includes(reference) ? current.filter((answer) => answer !== reference) : multiple ? [...current, reference] : [reference];
    updateQuestion(questionIndex, { correctAnswers: next });
  };

  const addSection = () => onSectionsChange([...sections, { key: newKey('section'), title: 'Untitled section', position: sections.length, pinned: false }]);

  return (
    <div className="space-y-5">
      {locked && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Question structure is locked because responses exist. Grading, points, correct answers, and explanations remain editable and reports will recalculate immediately.</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-950">Sections</h2><p className="mt-1 text-xs text-slate-500">Pinned sections keep their position when questions are jumbled.</p></div><button type="button" onClick={addSection} disabled={locked} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-40">Add section</button></div>
        {sections.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{sections.map((section, index) => (
          <div key={section.id ?? section.key ?? index} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <input value={section.title} disabled={locked} onChange={(event) => onSectionsChange(sections.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50" />
            <label className="flex items-center gap-1.5 text-xs text-slate-600"><input type="checkbox" checked={section.pinned ?? false} disabled={locked} onChange={(event) => onSectionsChange(sections.map((item, itemIndex) => itemIndex === index ? { ...item, pinned: event.target.checked } : item))} />Pin</label>
          </div>
        ))}</div>}
      </section>

      {questions.map((question, index) => {
        const isChoice = question.type === 'single_choice' || question.type === 'multiple_choice';
        return (
          <article key={question.id ?? index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">{index + 1}</span>
              <select value={question.type} disabled={locked} onChange={(event) => changeType(index, event.target.value as ExamQuestionType)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"><option value="single_choice">Single choice</option><option value="multiple_choice">Multiple choice</option><option value="true_false">True / false</option><option value="short_text">Short text</option></select>
              <select value={question.sectionId ?? question.sectionKey ?? ''} disabled={locked} onChange={(event) => updateQuestion(index, event.target.value ? { sectionId: sections.find((section) => section.id === event.target.value)?.id, sectionKey: sections.find((section) => (section.id ?? section.key) === event.target.value)?.key ?? null } : { sectionId: null, sectionKey: null })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"><option value="">No section</option>{sections.map((section, sectionIndex) => <option key={section.id ?? section.key ?? sectionIndex} value={section.id ?? section.key}>{section.title}</option>)}</select>
              <label className="ml-auto flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={question.pinned ?? false} disabled={locked} onChange={(event) => updateQuestion(index, { pinned: event.target.checked })} />Pinned</label>
              <button type="button" disabled={locked} onClick={() => onQuestionsChange(questions.filter((_, questionIndex) => questionIndex !== index))} className="text-sm font-medium text-red-600 disabled:opacity-30">Remove</button>
            </div>
            <textarea value={question.prompt} disabled={locked} onChange={(event) => updateQuestion(index, { prompt: event.target.value })} rows={2} className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-900 disabled:bg-slate-50" />

            {isChoice && <div className="mt-4 space-y-2">{(question.options ?? []).map((option, optionIndex) => {
              const reference = optionReference(option);
              return <div key={reference || optionIndex} className="flex items-center gap-3"><input type={question.type === 'multiple_choice' ? 'checkbox' : 'radio'} name={`correct-${index}`} checked={(question.correctAnswers ?? []).includes(reference)} onChange={() => toggleCorrect(index, reference, question.type === 'multiple_choice')} className="h-4 w-4" /><input value={option.label} disabled={locked} onChange={(event) => updateQuestion(index, { options: (question.options ?? []).map((item, itemIndex) => itemIndex === optionIndex ? { ...item, label: event.target.value } : item) })} className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50" /><button type="button" disabled={locked} onClick={() => updateQuestion(index, { options: (question.options ?? []).filter((_, itemIndex) => itemIndex !== optionIndex), correctAnswers: (question.correctAnswers ?? []).filter((answer) => answer !== reference) })} className="text-xs text-red-500 disabled:opacity-30">Remove</button></div>;
            })}<button type="button" disabled={locked} onClick={() => updateQuestion(index, { options: [...(question.options ?? []), { key: newKey('option'), label: `Option ${(question.options?.length ?? 0) + 1}` }] })} className="text-sm font-medium text-blue-600 disabled:opacity-30">+ Add option</button></div>}

            {question.type === 'true_false' && <div className="mt-4 flex gap-3">{['true', 'false'].map((value) => <label key={value} className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm capitalize"><input type="radio" name={`true-false-${index}`} checked={(question.correctAnswers ?? [])[0] === value} onChange={() => updateQuestion(index, { correctAnswers: [value] })} />{value}</label>)}</div>}
            {question.type === 'short_text' && <label className="mt-4 block text-sm text-slate-600">Accepted answer<input value={(question.correctAnswers ?? [])[0] ?? ''} onChange={(event) => updateQuestion(index, { correctAnswers: event.target.value ? [event.target.value] : [] })} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" /></label>}

            <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-[140px_1fr]">
              <label className="text-sm text-slate-600">Points<input type="number" min={0} value={question.points ?? 1} onChange={(event) => updateQuestion(index, { points: Number(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
              <label className="text-sm text-slate-600">Explanation<textarea value={question.explanation ?? ''} onChange={(event) => updateQuestion(index, { explanation: event.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" /></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={question.required ?? true} disabled={locked} onChange={(event) => updateQuestion(index, { required: event.target.checked })} />Required answer</label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={question.graded ?? true} onChange={(event) => updateQuestion(index, { graded: event.target.checked })} />Include in grade</label>
            </div>
          </article>
        );
      })}

      <button type="button" onClick={addQuestion} disabled={locked} className="w-full rounded-2xl border-2 border-dashed border-slate-300 bg-white py-5 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 disabled:opacity-40">+ Add question</button>
    </div>
  );
}
