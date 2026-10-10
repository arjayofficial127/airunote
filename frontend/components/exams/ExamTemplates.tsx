"use client";
import { useEffect, useState } from "react";
import { useOrgSession } from "@/providers/OrgSessionProvider";
import {
  appearanceApi,
  apiError,
  type ExamTemplate,
} from "@/lib/api/appearance";
import {
  plainAppearance,
  legacyAppearance,
  holidayAppearance,
  creatorAppearance,
} from "@/lib/exam-appearance";
import { AppearanceFields } from "./AppearanceFields";
import { AppearancePreview } from "./AppearancePreview";
export function ExamTemplates() {
  const session = useOrgSession();
  const org = session.activeOrgId;
  const admin = session.roles.some((r) =>
    ["admin", "superadmin"].includes(r.toLowerCase()),
  );
  const [rows, setRows] = useState<ExamTemplate[]>([]);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ExamTemplate | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState("");
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
  useEffect(() => {
    let active = true;
    setDraft(null);
    setRows([]);
    if (org)
      appearanceApi
        .list(org)
        .then((data) => {
          if (active) {
            setRows(data.templates);
            setDefaultId(data.defaultTemplateId);
          }
        })
        .catch((e) => {
          if (active) setMessage(apiError(e));
        });
    return () => {
      active = false;
    };
  }, [org]);
  const refresh = async () => {
    if (org) {
      const data = await appearanceApi.list(org);
      setRows(data.templates);
      setDefaultId(data.defaultTemplateId);
    }
  };
  const choose = (next: ExamTemplate) => {
    if (dirty && !window.confirm("Discard unsaved template changes?")) return;
    setDraft(structuredClone(next));
    setSaved(JSON.stringify(next));
    setMessage("");
  };
  const create = (style: "plain" | "autumn" | "holiday" | "creator") => {
    if (dirty && !window.confirm("Discard unsaved template changes?")) return;
    setDraft({
      id: "",
      name:
        style === "creator" ? "Creator · Holiday atelier" : style === "holiday"
          ? "Wrapped in Joy"
          : style === "autumn"
            ? "Autumn template"
            : "New template",
      config: structuredClone(
        style === "creator" ? creatorAppearance : style === "holiday"
          ? holidayAppearance
          : style === "autumn"
            ? legacyAppearance
            : plainAppearance,
      ),
      revision: 1,
      archivedAt: null,
    });
    setSaved("");
  };
  if (!org) return null;
  return (
    <div className="exam-editor exam-editor-container mx-auto max-w-[1600px] space-y-6 p-6 sm:p-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Exam templates</h1>
          <p className="mt-2 text-sm text-slate-500">
            Reusable designs for your organization. Saved exams keep their own
            appearance.
          </p>
        </div>
        {admin && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => create("plain")}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white"
            >
              New plain template
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => create("autumn")}
              className="rounded-xl border px-4 py-2 text-sm"
            >
              Start with Autumn
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => create("holiday")}
              className="rounded-xl border px-4 py-2 text-sm"
            >
              Start with Wrapped in Joy
            </button>
            <button type="button" onClick={() => create("creator")} className="rounded-xl border px-4 py-2 text-sm font-medium">New Creator theme</button>
          </div>
        )}
      </header>
      {message && (
        <p
          role="status"
          className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900"
        >
          {message}
        </p>
      )}
      <label className="block max-w-xl text-sm font-medium">
        Default for new exams
        <select
          disabled={!admin || busy}
          value={defaultId || ""}
          className="mt-2 w-full rounded-xl border p-3"
          onChange={async (e) => {
            setBusy(true);
            try {
              await appearanceApi.setDefault(org, e.target.value || null);
              await refresh();
              setMessage("Default saved. Existing exams are unchanged.");
            } catch (error) {
              setMessage(apiError(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          <option value="">Neutral Airunote</option>
          {rows
            .filter((t) => !t.archivedAt)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        {rows.map((t) => (
          <button
            type="button"
            key={t.id}
            disabled={busy}
            onClick={() => choose(t)}
            className={`rounded-xl border px-4 py-3 text-sm ${draft?.id === t.id ? "bg-slate-900 text-white" : "bg-white"}`}
          >
            {t.name}
            {t.archivedAt ? " · archived" : ""}
          </button>
        ))}
      </div>
      {draft && (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4">
            <label className="min-w-0 flex-1 text-sm">
              Template name
              <input
                disabled={!admin || busy || Boolean(draft.archivedAt)}
                className="mt-1 w-full rounded-lg border p-2"
                maxLength={100}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            {dirty && (
              <span className="text-xs text-amber-700">Unsaved changes</span>
            )}
            {admin && (
              <>
                <button
                  type="button"
                  disabled={
                    busy || !draft.name.trim() || Boolean(draft.archivedAt)
                  }
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const saved = draft.id
                        ? await appearanceApi.update(org, draft)
                        : await appearanceApi.create(
                            org,
                            draft.name,
                            draft.config,
                          );
                      setDraft(saved);
                      setSaved(JSON.stringify(saved));
                      await refresh();
                      setMessage(
                        "Template saved. Apply it from an exam’s Appearance tab.",
                      );
                    } catch (e) {
                      setMessage(apiError(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Save template
                </button>
                {draft.id && (
                  <button
                    type="button"
                    disabled={busy}
                    className="rounded-xl border px-4 py-2 text-sm"
                    onClick={() => {
                      setDraft({
                        ...draft,
                        id: "",
                        name: `${draft.name.slice(0, 90)} copy`,
                        archivedAt: null,
                        revision: 1,
                      });
                      setSaved("");
                    }}
                  >
                    Duplicate
                  </button>
                )}
                {draft.id && !draft.archivedAt && (
                  <button
                    type="button"
                    disabled={busy}
                    className="text-sm text-red-700"
                    onClick={async () => {
                      if (
                        !window.confirm(
                          "Archive this template? Existing exams keep their appearance.",
                        )
                      )
                        return;
                      setBusy(true);
                      try {
                        await appearanceApi.archive(org, draft.id);
                        setDraft(null);
                        setSaved("");
                        await refresh();
                        setMessage("Template archived.");
                      } catch (e) {
                        setMessage(apiError(e));
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Archive
                  </button>
                )}
              </>
            )}
          </div>
          <div className="exam-appearance-layout grid min-w-0 items-start gap-6">
            <AppearanceFields
              disabled={!admin || busy || Boolean(draft.archivedAt)}
              value={draft.config}
              onChange={(config) => setDraft({ ...draft, config })}
            />
            <div className="min-w-0">
              <AppearancePreview config={draft.config} orgId={org} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
