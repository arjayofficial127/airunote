'use client';
import { AdminSubnav } from './AdminWorkspace';
import type { ExamInput } from '@/lib/api/exams';
import { useCallback, useEffect, useState } from 'react';
import {
  appearanceApi,
  apiError,
  type ExamAppearance,
  type ExamTemplate,
} from '@/lib/api/appearance';
import {
  legacyAppearance,
  plainAppearance,
  holidayAppearance,
  creatorAppearance,
  appearanceSchema,
} from '@/lib/exam-appearance';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { AppearanceFields } from './AppearanceFields';
import { AppearancePreview } from './AppearancePreview';
export function ExamAppearanceEditor({
  examId,
  title,
  description,
  examDraft,
  view = 'edit',
  onStateChange,
}: {
  examDraft?: ExamInput;
  view?: 'edit' | 'preview';
  onStateChange?: (state: {
    dirty: boolean;
    busy: boolean;
    ready: boolean;
    save: () => Promise<void>;
  }) => void;
  examId: string;
  title: string;
  description: string | null | undefined;
}) {
  const session = useOrgSession();
  const org = session.activeOrgId;
  const admin = session.roles.some((r) =>
    ['admin', 'superadmin'].includes(r.toLowerCase()),
  );
  const [reload, setReload] = useState(0);
  const [group, setGroup] = useState('theme');
  const [mobileView, setMobileView] = useState('edit');
  const [previousDesign, setPreviousDesign] = useState<ExamAppearance | null>(
    null,
  );
  const [reloadOffer, setReloadOffer] = useState(false);
  const [draft, setDraft] = useState<ExamAppearance | null>(null);
  const [saved, setSaved] = useState('');
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  useEffect(() => {
    let active = true;
    setDraft(null);
    setMessage('');
    if (org)
      Promise.all([appearanceApi.get(org, examId), appearanceApi.list(org)])
        .then(([value, list]) => {
          if (active) {
            setDraft(value);
            setSaved(JSON.stringify(value));
            setTemplates(list.templates);
          }
        })
        .catch((e) => {
          if (active) setMessage(apiError(e));
        });
    return () => {
      active = false;
    };
  }, [org, examId, reload]);
  const dirty = Boolean(draft && JSON.stringify(draft) !== saved);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);
  const save = useCallback(async () => {
    if (!org || !draft) return;
    setBusy(true);
    setMessage('');
    try {
      appearanceSchema.parse(draft.config);
      const next = await appearanceApi.save(org, examId, draft);
      setDraft(next);
      setSaved(JSON.stringify(next));
      setMessage(
        'Appearance saved. New attempts use this design; existing attempts keep theirs.',
      );
    } catch (e) {
      setMessage(`${apiError(e)} Your appearance draft is preserved.`);
      setReloadOffer(true);
    } finally {
      setBusy(false);
    }
  }, [org, draft, examId]);
  useEffect(() => {
    onStateChange?.({ dirty, busy, ready: !!draft, save });
  }, [dirty, busy, draft, onStateChange, save]);
  const chooseTheme = (choice: string) => {
    if (!draft) return;
    setPreviousDesign(structuredClone(draft));
    const t = templates.find((t) => t.id === choice);
    if (t)
      setDraft({
        ...draft,
        templateId: t.id,
        config: structuredClone(t.config),
      });
    else if (choice === 'autumn')
      setDraft({
        ...draft,
        templateId: null,
        config: structuredClone(legacyAppearance),
      });
    else if (choice === 'plain')
      setDraft({
        ...draft,
        templateId: null,
        config: structuredClone(plainAppearance),
      });
    else if (choice === 'creator')
      setDraft({
        ...draft,
        templateId: null,
        config: {
          ...draft.config,
          renderer: 'creator',
          colors: {
            ...creatorAppearance.colors,
            logo: draft.config.colors.logo,
          },
          artwork: {
            ...creatorAppearance.artwork,
            caption:
              draft.config.artwork.caption || creatorAppearance.artwork.caption,
          },
        },
      });
    else if (choice === 'holiday')
      setDraft({
        ...draft,
        templateId: null,
        config: structuredClone(holidayAppearance),
      });
    else if (choice === 'custom') setDraft({ ...draft, templateId: null });
  };
  if (!org) return null;
  if (!draft)
    return (
      <p role="status" className="p-5 text-sm">
        {message || 'Loading appearance…'}
        {message && (
          <button
            type="button"
            className="ml-3 rounded-lg border px-4 py-2"
            onClick={() => setReload(reload + 1)}
          >
            Retry appearance
          </button>
        )}
      </p>
    );
  return (
    <div
      className={`admin-appearance ${view === 'preview' ? 'admin-preview-only' : ''}`}
    >
      {view === 'edit' && (
        <>
          <AdminSubnav
            label="Appearance sections"
            value={group}
            onChange={setGroup}
            items={[
              ['theme', 'Theme'],
              ['opening', 'Opening'],
              ['instructions', 'Instructions'],
              ['brand', 'Brand & artwork'],
              ['style', 'Style & audio'],
              ['completion', 'Completion'],
              ['all', 'All controls'],
            ]}
          />
          <div className="admin-mobile-preview-toggle">
            <button
              type="button"
              aria-pressed={mobileView === 'edit'}
              onClick={() => setMobileView('edit')}
            >
              Edit
            </button>
            <button
              type="button"
              aria-pressed={mobileView === 'preview'}
              onClick={() => setMobileView('preview')}
            >
              Preview
            </button>
          </div>
        </>
      )}
      <div className="appearance-workspace" data-mobile-view={mobileView}>
        <div
          hidden={view === 'preview'}
          className="appearance-controls space-y-5"
          aria-label="Appearance controls"
        >
          <div
            hidden={group !== 'theme' && group !== 'all'}
            className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border bg-white p-5"
          >
            <div className="max-w-xl">
              <h2 className="font-semibold">
                Exam appearance{' '}
                {dirty && (
                  <span className="text-xs text-amber-700">
                    · Unsaved changes
                  </span>
                )}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                This exam has its own saved appearance. Template changes are
                applied only when you choose them.
              </p>
              <div className="admin-theme-grid">
                {[
                  ['plain', 'Plain'],
                  ['autumn', 'Autumn'],
                  ['holiday', 'Wrapped in Joy'],
                  ['creator', 'Creator'],
                ].map(([key, label]) => (
                  <button
                    type="button"
                    key={key}
                    disabled={!admin || busy}
                    className="admin-theme-choice rounded-xl border p-3 text-left"
                    onClick={() => chooseTheme(key)}
                  >
                    <span
                      className={`admin-template-swatch admin-template-${key}`}
                      aria-hidden="true"
                    >
                      {key === 'plain' || key === 'autumn' ? 'Aa' : '✦'}
                    </span>
                    <b className="block text-sm">{label}</b>
                    <span className="block mt-1 text-xs">
                      Apply to appearance draft
                    </span>
                  </button>
                ))}
              </div>
              <label className="mt-3 block text-sm">
                Start from
                <select
                  disabled={!admin || busy}
                  className="mt-1 w-full rounded-lg border p-2"
                  value={draft.templateId || 'custom'}
                  onChange={(e) => chooseTheme(e.target.value)}
                >
                  <option value="custom">Custom appearance</option>
                  <option value="autumn">Built-in Autumn</option>
                  <option value="plain">Built-in Plain</option>
                  <option value="holiday">Built-in Wrapped in Joy</option>
                  <option value="creator">Creator · Holiday atelier</option>
                  {templates
                    .filter((t) => !t.archivedAt || t.id === draft.templateId)
                    .map((t) => (
                      <option
                        disabled={Boolean(t.archivedAt)}
                        key={t.id}
                        value={t.id}
                      >
                        {t.name}
                        {t.archivedAt ? ' (archived)' : ''}
                      </option>
                    ))}
                </select>
              </label>
              {draft.templateId && (
                <button
                  type="button"
                  disabled={!admin || busy}
                  className="mt-2 text-sm text-blue-700"
                  onClick={async () => {
                    try {
                      const list = await appearanceApi.list(org);
                      setTemplates(list.templates);
                      const t = list.templates.find(
                        (t) => t.id === draft.templateId && !t.archivedAt,
                      );
                      if (!t)
                        throw new Error('Template is archived or unavailable.');
                      setPreviousDesign(structuredClone(draft));
                      setDraft({ ...draft, config: structuredClone(t.config) });
                      setMessage(
                        'Latest template applied to the draft. Save appearance to publish it.',
                      );
                    } catch (e) {
                      setMessage(apiError(e));
                    }
                  }}
                >
                  Apply latest template to draft
                </button>
              )}
            </div>
            <button
              type="button"
              disabled={!admin || busy || !dirty}
              onClick={() => void save()}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save appearance'}
            </button>
          </div>
          {previousDesign && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setDraft(previousDesign);
                setPreviousDesign(null);
                setMessage('Previous appearance draft restored.');
              }}
              className="rounded-lg border px-4 py-3"
            >
              Undo theme change
            </button>
          )}
          {reloadOffer && (
            <div className="admin-notice admin-warning">
              <p>
                Keep your draft or explicitly load the saved appearance. Loading
                saved appearance discards your local appearance edits.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  try {
                    const latest = await appearanceApi.get(org, examId);
                    setPreviousDesign(draft);
                    setDraft(latest);
                    setSaved(JSON.stringify(latest));
                    setReloadOffer(false);
                    setMessage(
                      'Saved appearance loaded. Undo can restore your previous local draft.',
                    );
                  } catch (e) {
                    setMessage(apiError(e));
                  }
                }}
              >
                Load saved appearance
              </button>
            </div>
          )}
          {message && (
            <p
              role="status"
              className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900"
            >
              {message}
            </p>
          )}
          {!admin && (
            <p className="text-sm text-slate-500">
              Only organization admins can change appearance.
            </p>
          )}
          <AppearanceFields
            group={group}
            value={draft.config}
            disabled={!admin || busy}
            onChange={(config) => setDraft({ ...draft, config })}
          />
          {admin && (
            <div
              hidden={group !== 'theme' && group !== 'all'}
              className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4"
            >
              <input
                aria-label="New template name"
                placeholder="New reusable template name"
                maxLength={100}
                className="min-w-0 flex-1 rounded-lg border p-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <button
                type="button"
                disabled={busy || !name.trim()}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
                onClick={async () => {
                  setBusy(true);
                  try {
                    const t = await appearanceApi.create(
                      org,
                      name.trim(),
                      draft.config,
                    );
                    setTemplates([...templates, t]);
                    setName('');
                    setMessage(
                      'Reusable template created. This exam’s saved appearance has not changed.',
                    );
                  } catch (e) {
                    setMessage(apiError(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Save draft as new template
              </button>
            </div>
          )}
        </div>
        <div className="appearance-preview-panel" aria-label="Live preview">
          <AppearancePreview
            config={draft.config}
            title={title}
            description={description}
            examDraft={examDraft}
            orgId={org}
          />
        </div>
      </div>
    </div>
  );
}
