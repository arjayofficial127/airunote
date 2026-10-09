"use client";
import { useEffect, useState } from "react";
import {
  appearanceApi,
  apiError,
  type ExamAppearance,
  type ExamTemplate,
} from "@/lib/api/appearance";
import {
  legacyAppearance,
  plainAppearance,
  holidayAppearance,
  appearanceSchema,
} from "@/lib/exam-appearance";
import { useOrgSession } from "@/providers/OrgSessionProvider";
import { AppearanceFields } from "./AppearanceFields";
import { AppearancePreview } from "./AppearancePreview";
export function ExamAppearanceEditor({
  examId,
  title,
  description,
}: {
  examId: string;
  title: string;
  description: string | null | undefined;
}) {
  const session = useOrgSession();
  const org = session.activeOrgId;
  const admin = session.roles.some((r) =>
    ["admin", "superadmin"].includes(r.toLowerCase()),
  );
  const [draft, setDraft] = useState<ExamAppearance | null>(null);
  const [saved, setSaved] = useState("");
  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  useEffect(() => {
    let active = true;
    setDraft(null);
    setMessage("");
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
  }, [org, examId]);
  const dirty = Boolean(draft && JSON.stringify(draft) !== saved);
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const save = async () => {
    if (!org || !draft) return;
    setBusy(true);
    setMessage("");
    try {
      appearanceSchema.parse(draft.config);
      const next = await appearanceApi.save(org, examId, draft);
      setDraft(next);
      setSaved(JSON.stringify(next));
      setMessage(
        "Appearance saved. New attempts use this design; existing attempts keep theirs.",
      );
    } catch (e) {
      setMessage(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  if (!org) return null;
  if (!draft)
    return (
      <p role="status" className="p-5 text-sm">
        {message || "Loading appearance…"}
      </p>
    );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border bg-white p-5">
        <div className="max-w-xl">
          <h2 className="font-semibold">
            Exam appearance{" "}
            {dirty && (
              <span className="text-xs text-amber-700">· Unsaved changes</span>
            )}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            This exam has its own saved appearance. Template changes are applied
            only when you choose them.
          </p>
          <label className="mt-3 block text-sm">
            Start from
            <select
              disabled={!admin || busy}
              className="mt-1 w-full rounded-lg border p-2"
              value={draft.templateId || "custom"}
              onChange={(e) => {
                const t = templates.find((t) => t.id === e.target.value);
                if (t)
                  setDraft({
                    ...draft,
                    templateId: t.id,
                    config: structuredClone(t.config),
                  });
                else if (e.target.value === "autumn")
                  setDraft({
                    ...draft,
                    templateId: null,
                    config: structuredClone(legacyAppearance),
                  });
                else if (e.target.value === "plain")
                  setDraft({
                    ...draft,
                    templateId: null,
                    config: structuredClone(plainAppearance),
                  });
                else if (e.target.value === "holiday")
                  setDraft({
                    ...draft,
                    templateId: null,
                    config: structuredClone(holidayAppearance),
                  });
                else if (e.target.value === "custom")
                  setDraft({ ...draft, templateId: null });
              }}
            >
              <option value="custom">Custom appearance</option>
              <option value="autumn">Built-in Autumn</option>
              <option value="plain">Built-in Plain</option>
              <option value="holiday">Built-in Wrapped in Joy</option>
              {templates
                .filter((t) => !t.archivedAt || t.id === draft.templateId)
                .map((t) => (
                  <option
                    disabled={Boolean(t.archivedAt)}
                    key={t.id}
                    value={t.id}
                  >
                    {t.name}
                    {t.archivedAt ? " (archived)" : ""}
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
                    throw new Error("Template is archived or unavailable.");
                  setDraft({ ...draft, config: structuredClone(t.config) });
                  setMessage(
                    "Latest template applied to the draft. Save appearance to publish it.",
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
          {busy ? "Saving…" : "Save appearance"}
        </button>
      </div>
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
      <div className="exam-appearance-layout grid min-w-0 items-start gap-6">
        <AppearanceFields
          value={draft.config}
          disabled={!admin || busy}
          onChange={(config) => setDraft({ ...draft, config })}
        />
        <div className="min-w-0">
          <AppearancePreview
            config={draft.config}
            title={title}
            description={description}
            orgId={org}
          />
        </div>
      </div>
      {admin && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4">
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
                setName("");
                setMessage(
                  "Reusable template created. This exam’s saved appearance has not changed.",
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
  );
}
