'use client';
import { useState } from 'react';
import type { ExamInput, ExamReviewMode, ExamStatus } from '@/lib/api/exams';
import { AdminSubnav } from './AdminWorkspace';
const inputClass =
  'mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900';
function toLocal(value: string | null | undefined) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isFinite(d.getTime())
    ? new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
    : '';
}
function toIso(value: string) {
  const d = new Date(value);
  return value && Number.isFinite(d.getTime()) ? d.toISOString() : null;
}
export function ExamSettingsEditor({
  value,
  onChange,
}: {
  value: ExamInput;
  onChange: (value: ExamInput) => void;
}) {
  const [section, setSection] = useState<
    'details' | 'timing' | 'rules' | 'identity'
  >('details');
  const [limited, setLimited] = useState(value.maxAttempts || 3);
  const update = <K extends keyof ExamInput>(
    key: K,
    fieldValue: ExamInput[K],
  ) => onChange({ ...value, [key]: fieldValue });
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const format = (v: string | null | undefined) =>
    v
      ? new Date(v).toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : 'Not set';
  return (
    <div className="admin-settings">
      <AdminSubnav
        label="Exam setup sections"
        value={section}
        onChange={setSection}
        items={[
          ['details', 'Details'],
          ['timing', 'Timing & attempts'],
          ['rules', 'Answering rules'],
          ['identity', 'Identity & results'],
        ]}
      />
      <div hidden={section !== 'details'} className="admin-two-columns">
        <section className="admin-panel">
          <h2>Exam details</h2>
          <label>
            Title
            <input
              className={inputClass}
              value={value.title}
              onChange={(e) => update('title', e.target.value)}
            />
          </label>
          <label>
            Instructions
            <textarea
              className={inputClass}
              rows={6}
              value={value.description ?? ''}
              onChange={(e) => update('description', e.target.value)}
            />
          </label>
          <label>
            Public exam ID
            <div className="mt-2 flex min-w-0 overflow-hidden rounded-xl border">
              <span className="bg-slate-50 px-3 py-3">/exam/</span>
              <input
                className="min-w-0 flex-1 p-3 font-mono"
                maxLength={80}
                spellCheck={false}
                value={value.publicId ?? ''}
                onChange={(e) =>
                  update(
                    'publicId',
                    e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, '-')
                      .replace(/[^a-z0-9-]/g, ''),
                  )
                }
              />
            </div>
            <small>
              3–80 lowercase letters, numbers, and hyphens. Changing this
              replaces the old public link.
            </small>
          </label>
        </section>
        <aside className="admin-panel">
          <h2>Current draft at a glance</h2>
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="admin-hint">Questions</dt>
              <dd className="font-semibold">
                {value.questions?.filter((q) => !q.entryField).length ?? 0}
              </dd>
            </div>
            <div>
              <dt className="admin-hint">Duration</dt>
              <dd className="font-semibold">
                {value.durationMinutes ?? 20} minutes
              </dd>
            </div>
            <div>
              <dt className="admin-hint">Attempt limit</dt>
              <dd className="font-semibold">
                {value.maxAttempts === 0
                  ? 'Unlimited'
                  : (value.maxAttempts ?? 3)}
              </dd>
            </div>
            <div>
              <dt className="admin-hint">Draft publication choice</dt>
              <dd className="font-semibold capitalize">
                {value.status ?? 'draft'}
              </dd>
            </div>
          </dl>
          <p className="admin-notice">
            These values reflect this draft. Save exam to apply changes.
            Appearance saves separately.
          </p>
          <button
            type="button"
            className="rounded-lg border px-4 py-3"
            onClick={() => setSection('timing')}
          >
            Edit timing & attempts
          </button>
          <button
            type="button"
            className="mt-2 rounded-lg border px-4 py-3"
            onClick={() => setSection('identity')}
          >
            Edit identity & results
          </button>
        </aside>
      </div>
      <div hidden={section !== 'timing'}>
        <div className="admin-two-columns">
          <section className="admin-panel">
            <h2>Duration & attempts</h2>
            <label>
              Duration (minutes)
              <input
                className={inputClass}
                type="number"
                min={1}
                max={1440}
                value={value.durationMinutes ?? 20}
                onChange={(e) =>
                  update('durationMinutes', Number(e.target.value))
                }
              />
            </label>
            <label>
              Attempt limit
              <select
                aria-label="Attempt limit"
                className={inputClass}
                value={value.maxAttempts === 0 ? 'unlimited' : 'limited'}
                onChange={(e) =>
                  update(
                    'maxAttempts',
                    e.target.value === 'unlimited' ? 0 : limited,
                  )
                }
              >
                <option value="unlimited">Unlimited</option>
                <option value="limited">Limited</option>
              </select>
            </label>
            {value.maxAttempts !== 0 && (
              <label>
                Maximum attempts
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  max={100}
                  value={value.maxAttempts ?? limited}
                  onChange={(e) => {
                    const n = Math.max(1, Number(e.target.value) || 1);
                    setLimited(n);
                    update('maxAttempts', n);
                  }}
                />
              </label>
            )}
            <p className="admin-hint">
              Per participant: Partner Number or student/employee ID, otherwise
              email, otherwise full name. Timers and exam rules still apply.
            </p>
            <label>
              Publication status
              <select
                className={inputClass}
                value={value.status ?? 'draft'}
                onChange={(e) => update('status', e.target.value as ExamStatus)}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="closed">Closed</option>
              </select>
            </label>
          </section>
          <section className="admin-panel">
            <h2>Response window</h2>
            <p className="admin-hint">
              Published exams wait until the opening time and stop accepting new
              attempts after the closing time. Leave either field blank for an
              open end.
            </p>
            <label>
              Opens at (optional)
              <input
                className={inputClass}
                type="datetime-local"
                value={toLocal(value.startsAt)}
                onChange={(e) => update('startsAt', toIso(e.target.value))}
              />
            </label>
            <label>
              Closes at (optional)
              <input
                className={inputClass}
                type="datetime-local"
                value={toLocal(value.endsAt)}
                onChange={(e) => update('endsAt', toIso(e.target.value))}
              />
            </label>
            <div className="admin-notice">
              <b>Device timezone: {timezone}</b>
              <p>
                Opens: {format(value.startsAt)}
                <br />
                Closes: {format(value.endsAt)}
              </p>
            </div>
            {value.startsAt &&
              value.endsAt &&
              new Date(value.endsAt) <= new Date(value.startsAt) && (
                <p role="alert" className="text-red-700">
                  Closing time must be after opening time.
                </p>
              )}
          </section>
        </div>
      </div>
      <section hidden={section !== 'rules'} className="admin-panel">
        <h2>Answering rules</h2>
        {(
          [
            [
              'oneQuestionAtATime',
              'One question at a time',
              'Reduce distraction and prevent looking ahead.',
            ],
            [
              'shuffleQuestions',
              'Shuffle questions',
              'Pinned sections and questions stay in place.',
            ],
            [
              'shuffleOptions',
              'Shuffle answer choices',
              'Each attempt receives its own option order.',
            ],
            [
              'preventFocusLoss',
              'Focus lock',
              'Leaving the tab ends the attempt and requires an admin continue link.',
            ],
          ] as const
        ).map(([key, label, description]) => (
          <label key={key} className="admin-toggle">
            <input
              type="checkbox"
              checked={Boolean(value[key])}
              onChange={(e) => update(key, e.target.checked)}
            />
            <span>
              {label}
              <small>{description}</small>
            </span>
          </label>
        ))}
        {value.preventFocusLoss && (
          <div className="admin-notice admin-warning">
            <b>
              Respondents cannot continue on their own after leaving the tab.
            </b>
            <p>
              Issue an eligible continuation link from Reports. Per-question
              time limits remain available in Questions.
            </p>
          </div>
        )}
      </section>
      <div hidden={section !== 'identity'}>
        <div className="admin-two-columns">
          <section className="admin-panel">
            <h2>Respondent identity</h2>
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={value.requireEmail ?? false}
                onChange={(e) => update('requireEmail', e.target.checked)}
              />
              <span>Require email</span>
            </label>
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={value.requireIdentifier ?? false}
                onChange={(e) => update('requireIdentifier', e.target.checked)}
              />
              <span>Require student/employee ID</span>
            </label>
            <p className="admin-hint">
              Additional short-text and date entry fields are managed in
              Questions. They are collected before the timer and never graded.
            </p>
            {value.questions
              ?.filter((q) => q.entryField)
              .map((q, i) => (
                <div className="admin-notice" key={q.id ?? i}>
                  {q.type === 'date'
                    ? 'Date and time · Server-recorded, read-only'
                    : q.prompt}
                </div>
              ))}
            <small>
              Device, IP, and browser signals are hashed and retained for
              attempt review.
            </small>
          </section>
          <section className="admin-panel">
            <h2>After submission</h2>
            <label>
              Respondent can see
              <select
                className={inputClass}
                value={value.reviewMode ?? 'respondent_answers'}
                onChange={(e) =>
                  update('reviewMode', e.target.value as ExamReviewMode)
                }
              >
                <option value="none">Completion only</option>
                <option value="respondent_answers">
                  Their answers, without correct answers
                </option>
                <option value="with_correct_answers">
                  Their answers and correct answers
                </option>
              </select>
            </label>
            <p className="admin-hint">
              Completion wording, celebration, and footer are configured
              separately in Appearance.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
