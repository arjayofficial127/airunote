'use client';

import { useEffect, useRef, useState } from 'react';
import {
  normalizeStructure,
  removeSection,
  sectionReference,
  questionReference,
} from '../../../backend-node/src/modules/exams/section-structure';
import { SectionDeleteDialog } from './SectionDeleteDialog';
import type {
  ExamQuestionInput,
  ExamQuestionType,
  ExamSectionInput,
} from '@/lib/api/exams';

interface ExamQuestionsEditorProps {
  questions: ExamQuestionInput[];
  sections: ExamSectionInput[];
  locked: boolean;
  onChange: (structure: {
    questions: ExamQuestionInput[];
    sections: ExamSectionInput[];
  }) => void;
  revision: string;
}

function newKey(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function optionReference(option: { id?: string; key?: string }): string {
  return option.id ?? option.key ?? '';
}

export function ExamQuestionsEditor({
  questions,
  sections,
  locked,
  onChange,
  revision,
}: ExamQuestionsEditorProps) {
  const [mode, setMode] = useState<'all' | 'focus'>('focus');
  const [focused, setFocused] = useState(questions[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<string | null>(null);
  const [destination, setDestination] = useState('');
  const [notice, setNotice] = useState('');
  const [undo, setUndo] = useState<{
    questions: ExamQuestionInput[];
    sections: ExamSectionInput[];
    result: string;
  } | null>(null);
  const [highlight, setHighlight] = useState<string[]>([]);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setUndo(null);
  }, [revision]);
  useEffect(() => {
    if (!highlight.length) return;
    const timer = setTimeout(() => setHighlight([]), 2500);
    return () => clearTimeout(timer);
  }, [highlight]);
  const currentSignature = JSON.stringify({ sections, questions });
  const canUndo = undo && undo.result === currentSignature && !locked;
  const commit = (
    nextSections: ExamSectionInput[],
    nextQuestions: ExamQuestionInput[],
  ) => {
    setUndo(null);
    onChange(normalizeStructure(nextSections, nextQuestions));
  };
  const onQuestionsChange = (next: ExamQuestionInput[]) =>
    commit(sections, next);
  const onSectionsChange = (next: ExamSectionInput[]) =>
    commit(next, questions);
  const updateQuestion = (
    index: number,
    update: Partial<ExamQuestionInput>,
  ) => {
    const changed = { ...questions[index], ...update };
    if ('sectionId' in update || 'sectionKey' in update)
      changed.position =
        Math.max(-1, ...questions.map((q) => q.position ?? 0)) + 1;
    onQuestionsChange(
      questions.map((question, questionIndex) =>
        questionIndex === index ? changed : question,
      ),
    );
  };
  const reveal = (ref: string, focus: boolean | 'heading' = false) => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      next.delete(ref);
      return next;
    });
    requestAnimationFrame(() => {
      const group = Array.from(
        root.current?.querySelectorAll<HTMLElement>('[data-section]') ?? [],
      ).find((node) => node.dataset.section === ref);
      group?.scrollIntoView({ block: 'nearest' });
      if (focus === 'heading')
        group
          ?.querySelector<HTMLButtonElement>('button')
          ?.focus({ preventScroll: true });
      if (focus === true) {
        const input = group?.querySelector<HTMLInputElement>(
          'input[data-section-title]',
        );
        input?.focus();
        input?.select();
      }
    });
  };
  const addQuestion = (ref = '') => {
    const section = sections.find((s, i) => sectionReference(s, i) === ref);
    const id = crypto.randomUUID();
    setFocused(id);
    onQuestionsChange([
      ...questions,
      {
        id,
        sectionId: section?.id ?? null,
        sectionKey: section?.id ? null : (section?.key ?? null),
        type: 'single_choice',
        prompt: 'Untitled question',
        required: true,
        graded: false,
        points: 1,
        position: questions.length,
        pinned: false,
        correctAnswers: [],
        options: [
          { key: newKey('option'), label: 'Option 1' },
          { key: newKey('option'), label: 'Option 2' },
        ],
      },
    ]);
    reveal(ref);
  };
  const deleteSection = (source: string, target: string) => {
    if (locked) return;
    const moved = questions.filter((q) => questionReference(q) === source);
    const next = removeSection(sections, questions, source, target);
    onChange(next);
    setUndo({ sections, questions, result: JSON.stringify(next) });
    setPending(null);
    setHighlight(moved.map((q) => q.id ?? q.prompt));
    setNotice(
      `Section deleted. ${moved.length ? `${moved.length} question${moved.length === 1 ? '' : 's'} kept and moved.` : 'No questions removed.'} Save exam to keep this change.`,
    );
    reveal(target, 'heading');
  };
  const requestDelete = (ref: string, index: number) => {
    const target =
      index > 0 ? sectionReference(sections[index - 1], index - 1) : '';
    if (!questions.some((q) => questionReference(q) === ref)) {
      deleteSection(ref, target);
      return;
    }
    setDestination(target);
    setPending(ref);
  };
  const changeType = (index: number, type: ExamQuestionType) => {
    const options =
      type === 'single_choice' || type === 'multiple_choice'
        ? [
            { key: newKey('option'), label: 'Option 1' },
            { key: newKey('option'), label: 'Option 2' },
          ]
        : [];
    updateQuestion(index, { type, options, correctAnswers: [] });
  };

  const toggleCorrect = (
    questionIndex: number,
    reference: string,
    multiple: boolean,
  ) => {
    const current = questions[questionIndex].correctAnswers ?? [];
    const next = current.includes(reference)
      ? current.filter((answer) => answer !== reference)
      : multiple
        ? [...current, reference]
        : [reference];
    updateQuestion(questionIndex, { correctAnswers: next });
  };

  const addSection = () => {
    let number = 1;
    while (sections.some((s) => s.title === `Section ${number}`)) number++;
    const key = newKey('section');
    onSectionsChange([
      ...sections,
      {
        key,
        title: `Section ${number}`,
        position: sections.length,
        pinned: false,
      },
    ]);
    reveal(key, true);
  };
  const reorderSection = (index: number, direction: number) => {
    const next = [...sections];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    commit(
      next.map((section, position) => ({ ...section, position })),
      questions,
    );
  };
  const renderQuestion = (question: ExamQuestionInput, index: number) => {
    const isChoice =
      question.type === 'single_choice' || question.type === 'multiple_choice';
    return (
      <article
        hidden={
          mode === 'focus' &&
          (question.id ?? String(index)) !==
            (questions.some((q, i) => (q.id ?? String(i)) === focused)
              ? focused
              : questions[0]?.id || '0')
        }
        data-question={question.id ?? index}
        key={question.id ?? index}
        className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${highlight.includes(question.id ?? question.prompt) ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
            {question.entryField
              ? 'Info'
              : questions.slice(0, index + 1).filter((q) => !q.entryField)
                  .length}
          </span>
          <select
            value={question.type}
            disabled={locked}
            onChange={(event) =>
              changeType(index, event.target.value as ExamQuestionType)
            }
            className="min-w-0 max-w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
          >
            <option value="single_choice">Single choice</option>
            <option value="multiple_choice">Multiple choice</option>
            <option value="true_false">True / false</option>
            <option value="short_text">Short text</option>
            <option value="date">Date (YYYY-MM-DD)</option>
          </select>
          <select
            aria-label={`Question ${index + 1} section`}
            value={question.sectionId ?? question.sectionKey ?? ''}
            disabled={locked}
            onChange={(event) =>
              updateQuestion(
                index,
                event.target.value
                  ? {
                      sectionId: sections.find(
                        (section) => section.id === event.target.value,
                      )?.id,
                      sectionKey:
                        sections.find(
                          (section) =>
                            (section.id ?? section.key) === event.target.value,
                        )?.key ?? null,
                    }
                  : { sectionId: null, sectionKey: null },
              )
            }
            className="min-w-0 max-w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
          >
            <option value="">General questions</option>
            {sections.map((section, sectionIndex) => (
              <option
                key={section.id ?? section.key ?? sectionIndex}
                value={section.id ?? section.key}
              >
                {section.title}
              </option>
            ))}
          </select>
          <label className="ml-auto flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={question.pinned ?? false}
              disabled={locked}
              onChange={(event) =>
                updateQuestion(index, { pinned: event.target.checked })
              }
            />
            Pinned
          </label>
          <button
            type="button"
            disabled={locked}
            onClick={() =>
              onQuestionsChange(
                questions.filter((_, questionIndex) => questionIndex !== index),
              )
            }
            className="text-sm font-medium text-red-600 disabled:opacity-30"
          >
            Delete question
          </button>
        </div>
        <textarea
          aria-label={`Question ${index + 1} prompt`}
          value={question.prompt}
          disabled={locked}
          onChange={(event) =>
            updateQuestion(index, { prompt: event.target.value })
          }
          rows={2}
          className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-900 disabled:bg-slate-50"
        />

        {isChoice && (
          <div className="mt-4 space-y-2">
            {(question.options ?? []).map((option, optionIndex) => {
              const reference = optionReference(option);
              return (
                <div
                  key={reference || optionIndex}
                  className="flex items-center gap-3"
                >
                  <input
                    type={
                      question.type === 'multiple_choice' ? 'checkbox' : 'radio'
                    }
                    name={`correct-${index}`}
                    checked={(question.correctAnswers ?? []).includes(
                      reference,
                    )}
                    onChange={() =>
                      toggleCorrect(
                        index,
                        reference,
                        question.type === 'multiple_choice',
                      )
                    }
                    className="h-4 w-4"
                  />
                  <input
                    value={option.label}
                    disabled={locked}
                    onChange={(event) =>
                      updateQuestion(index, {
                        options: (question.options ?? []).map(
                          (item, itemIndex) =>
                            itemIndex === optionIndex
                              ? { ...item, label: event.target.value }
                              : item,
                        ),
                      })
                    }
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                  />
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() =>
                      updateQuestion(index, {
                        options: (question.options ?? []).filter(
                          (_, itemIndex) => itemIndex !== optionIndex,
                        ),
                        correctAnswers: (question.correctAnswers ?? []).filter(
                          (answer) => answer !== reference,
                        ),
                      })
                    }
                    className="text-xs text-red-500 disabled:opacity-30"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              disabled={locked}
              onClick={() =>
                updateQuestion(index, {
                  options: [
                    ...(question.options ?? []),
                    {
                      key: newKey('option'),
                      label: `Option ${(question.options?.length ?? 0) + 1}`,
                    },
                  ],
                })
              }
              className="text-sm font-medium text-blue-600 disabled:opacity-30"
            >
              + Add option
            </button>
          </div>
        )}

        {question.type === 'true_false' && (
          <div className="mt-4 flex gap-3">
            {['true', 'false'].map((value) => (
              <label
                key={value}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm capitalize"
              >
                <input
                  type="radio"
                  name={`true-false-${index}`}
                  checked={(question.correctAnswers ?? [])[0] === value}
                  onChange={() =>
                    updateQuestion(index, { correctAnswers: [value] })
                  }
                />
                {value}
              </label>
            ))}
          </div>
        )}
        {!question.entryField &&
          (question.type === 'short_text' || question.type === 'date') && (
            <label className="mt-4 block text-sm text-slate-600">
              Accepted answer
              <input
                type={question.type === 'date' ? 'date' : 'text'}
                value={(question.correctAnswers ?? [])[0] ?? ''}
                onChange={(event) =>
                  updateQuestion(index, {
                    correctAnswers: event.target.value
                      ? [event.target.value]
                      : [],
                  })
                }
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </label>
          )}

        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <label className="text-sm text-slate-600">
            Points
            <input
              type="number"
              min={0}
              disabled={question.entryField}
              value={question.points ?? 1}
              onChange={(event) =>
                updateQuestion(index, { points: Number(event.target.value) })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm text-slate-600">
            Max time (seconds)
            <input
              type="number"
              min={5}
              max={3600}
              value={question.maxTimeSeconds ?? ''}
              disabled={locked || question.entryField}
              onChange={(event) =>
                updateQuestion(index, {
                  maxTimeSeconds: event.target.value
                    ? Number(event.target.value)
                    : null,
                })
              }
              placeholder="No limit"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-50"
            />
            <span className="mt-1 block text-[11px] text-slate-400">
              Blank uses the overall exam timer.
            </span>
          </label>
          <label className="text-sm text-slate-600">
            Explanation
            <textarea
              value={question.explanation ?? ''}
              onChange={(event) =>
                updateQuestion(index, { explanation: event.target.value })
              }
              rows={2}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-5">
          {['date', 'short_text'].includes(question.type) && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={locked}
                checked={question.entryField ?? false}
                onChange={(event) =>
                  updateQuestion(index, {
                    entryField: event.target.checked,
                    graded: false,
                    points: 0,
                    maxTimeSeconds: null,
                    correctAnswers: [],
                  })
                }
              />
              Collect in Your details before the timer
            </label>
          )}
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={question.required ?? true}
              disabled={locked}
              onChange={(event) =>
                updateQuestion(index, { required: event.target.checked })
              }
            />
            Required answer
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              disabled={question.entryField}
              checked={question.graded ?? true}
              onChange={(event) =>
                updateQuestion(index, { graded: event.target.checked })
              }
            />
            Include in grade
          </label>
        </div>
      </article>
    );
  };
  const groups = [
    {
      ref: '',
      title: 'General questions',
      section: null as ExamSectionInput | null,
      index: -1,
    },
    ...sections.map((section, index) => ({
      ref: sectionReference(section, index),
      title: section.title,
      section,
      index,
    })),
  ];
  const selected = groups.find((group) => group.ref === pending);
  const count = (ref: string) =>
    questions.filter((q) => !q.entryField && questionReference(q) === ref)
      .length;
  return (
    <div ref={root} className="admin-question-workspace">
      <aside className="admin-question-outline">
        <h2 className="font-semibold">Question outline</h2>
        <label className="block my-3 text-sm">
          Find a question
          <input
            className="mt-2 w-full rounded-lg border p-3"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search question text"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={mode === 'focus'}
            onClick={() => setMode('focus')}
            className="rounded-lg border px-3 py-2"
          >
            Focused editor
          </button>
          <button
            type="button"
            aria-pressed={mode === 'all'}
            onClick={() => {
              setMode('all');
              setCollapsed(new Set());
            }}
            className="rounded-lg border px-3 py-2"
          >
            All questions
          </button>
        </div>
        <div className="admin-question-outline-list" aria-label="Questions">
          {questions.map(
            (q, i) =>
              q.prompt.toLowerCase().includes(query.toLowerCase()) && (
                <button
                  key={q.id ?? i}
                  type="button"
                  aria-pressed={(q.id ?? String(i)) === focused}
                  onClick={() => {
                    setFocused(q.id ?? String(i));
                    setMode('focus');
                    reveal(questionReference(q));
                  }}
                >
                  <b>
                    {q.entryField
                      ? 'Entry field'
                      : `Q${questions.slice(0, i + 1).filter((x) => !x.entryField).length}`}
                  </b>
                  <span>{q.prompt}</span>
                  <small>
                    {q.type.replaceAll('_', ' ')}
                    {q.pinned ? ' · Pinned' : ''}
                  </small>
                </button>
              ),
          )}
        </div>
      </aside>
      <div className="min-w-0 space-y-5">
        {locked && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Question structure is locked because responses exist. Duplicate this
            exam to reorganize it. Grading, points, correct answers, and
            explanations remain editable.
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white p-5">
          <div>
            <h2 className="font-semibold">Questions and sections</h2>
            <p className="mt-1 text-sm text-slate-500">
              {questions.filter((q) => !q.entryField).length} questions ·{' '}
              {sections.length} named sections. General questions appear first.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('all');
                setCollapsed(new Set());
              }}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={() => setCollapsed(new Set(groups.map((g) => g.ref)))}
              className="rounded-lg border px-3 py-2 text-sm"
            >
              Collapse all
            </button>
            <button
              type="button"
              onClick={addSection}
              disabled={locked}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Add section
            </button>
          </div>
        </div>
        <div
          role="status"
          aria-live="polite"
          className={
            notice
              ? 'rounded-xl bg-blue-50 p-4 text-sm text-blue-900'
              : 'sr-only'
          }
        >
          {notice}
          {canUndo && (
            <button
              type="button"
              className="ml-3 min-h-11 font-semibold underline"
              onClick={() => {
                onChange({
                  questions: undo.questions,
                  sections: undo.sections,
                });
                setUndo(null);
                setNotice('Section restored.');
              }}
            >
              Undo
            </button>
          )}
        </div>
        {questions.some((q) => q.entryField) && (
          <section className="rounded-2xl border bg-white p-5">
            <h2 className="font-semibold">Your details · Before the timer</h2>
            <p className="my-3 text-sm text-slate-500">
              Date and time are recorded by the server. Full Name and Partner
              Number are collected with these fields. Entry details are never
              graded or timed.
            </p>
            {questions
              .filter((q) => q.entryField)
              .map((q) => (
                <div key={q.id ?? q.prompt} className="border-t py-3">
                  <strong>
                    {q.type === 'date' ? 'Date and time' : q.prompt}
                  </strong>
                  <button
                    type="button"
                    onClick={() => {
                      setFocused(q.id ?? String(questions.indexOf(q)));
                      setMode('focus');
                    }}
                    className="ml-3 rounded-lg border px-3 py-2"
                  >
                    Edit entry field
                  </button>
                  {renderQuestion(q, questions.indexOf(q))}
                  <p className="text-sm text-slate-500">
                    {q.type === 'date'
                      ? 'Automatic · Read-only · Server timestamp'
                      : 'Required before starting'}
                  </p>
                </div>
              ))}
          </section>
        )}
        {groups
          .filter(
            (group) =>
              count(group.ref) > 0 ||
              !questions.some(
                (q) => q.entryField && questionReference(q) === group.ref,
              ),
          )
          .map((group) => (
            <section
              key={group.ref}
              data-section={group.ref}
              className="min-w-0 rounded-2xl border border-slate-200 bg-slate-100/60 p-3 sm:p-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  aria-expanded={!collapsed.has(group.ref)}
                  aria-label={`${collapsed.has(group.ref) ? 'Expand' : 'Collapse'} ${group.title}`}
                  onClick={() =>
                    setCollapsed((previous) => {
                      const next = new Set(previous);
                      if (next.has(group.ref)) next.delete(group.ref);
                      else next.add(group.ref);
                      return next;
                    })
                  }
                  className="h-11 w-11 shrink-0 rounded-lg border bg-white"
                >
                  {collapsed.has(group.ref) ? '+' : '−'}
                </button>
                <div className="min-w-0 flex-1 basis-40">
                  {group.section ? (
                    <input
                      data-section-title
                      aria-label={`Section ${group.index + 1} name`}
                      value={group.title}
                      disabled={locked}
                      onChange={(event) =>
                        onSectionsChange(
                          sections.map((s, i) =>
                            i === group.index
                              ? { ...s, title: event.target.value }
                              : s,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold disabled:bg-slate-50"
                    />
                  ) : (
                    <h3 className="font-semibold">General questions</h3>
                  )}
                  <p className="mt-1 text-xs text-slate-500">
                    {count(group.ref)
                      ? `${count(group.ref)} question${count(group.ref) === 1 ? '' : 's'}`
                      : group.section
                        ? 'Empty section'
                        : 'No general questions'}
                  </p>
                </div>
                {group.section && (
                  <>
                    <button
                      type="button"
                      aria-label={`Move ${group.title} up`}
                      disabled={locked || group.index === 0}
                      onClick={() => reorderSection(group.index, -1)}
                      className="h-11 w-11 rounded-lg border bg-white disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${group.title} down`}
                      disabled={locked || group.index === sections.length - 1}
                      onClick={() => reorderSection(group.index, 1)}
                      className="h-11 w-11 rounded-lg border bg-white disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <label
                      title="Keep this section in its position when questions are shuffled"
                      className="flex min-h-11 items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={group.section.pinned ?? false}
                        disabled={locked}
                        onChange={(event) =>
                          onSectionsChange(
                            sections.map((s, i) =>
                              i === group.index
                                ? { ...s, pinned: event.target.checked }
                                : s,
                            ),
                          )
                        }
                      />
                      Pin section
                    </label>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => requestDelete(group.ref, group.index)}
                      className="min-h-11 rounded-lg px-3 text-sm text-red-700 disabled:opacity-40"
                    >
                      Delete section
                    </button>
                  </>
                )}
              </div>
              {!collapsed.has(group.ref) && (
                <div className="mt-4 space-y-4">
                  {group.section && (
                    <p className="text-xs text-slate-500">
                      Section {group.index + 1} · Pinned sections keep their
                      position when questions are shuffled.
                    </p>
                  )}
                  {questions.map((question, index) =>
                    !question.entryField &&
                    questionReference(question) === group.ref
                      ? renderQuestion(question, index)
                      : null,
                  )}
                  {!count(group.ref) && (
                    <p className="py-3 text-sm text-slate-500">
                      {group.section
                        ? 'Add a question here or move one into this section.'
                        : 'Questions without a named section appear here. Named sections are optional.'}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => addQuestion(group.ref)}
                    disabled={locked}
                    className="min-h-11 w-full rounded-xl border border-dashed border-slate-400 bg-white px-4 py-3 text-sm font-semibold disabled:opacity-40"
                  >
                    + Add question here
                  </button>
                </div>
              )}
            </section>
          ))}
        {selected && (
          <SectionDeleteDialog
            title={selected.title}
            count={count(selected.ref)}
            destination={destination}
            destinations={groups
              .filter((g) => g.ref !== pending)
              .map((g) => ({
                value: g.ref,
                label: `${g.title || 'Untitled section'} (${count(g.ref)} question${count(g.ref) === 1 ? '' : 's'})`,
              }))}
            last={sections.length === 1}
            onDestination={setDestination}
            onCancel={() => setPending(null)}
            onConfirm={() => deleteSection(selected.ref, destination)}
          />
        )}
      </div>
    </div>
  );
}
