"use client";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ExamAppearanceProvider } from "./ExamAppearanceProvider";
import { ExamContent } from "./PublicExamPage";
import type { usePublicExam } from "./usePublicExam";
import type { Appearance } from "@/lib/exam-appearance";
import type { PublicExamOverview, PublicAttempt, ExamInput } from "@/lib/api/exams";
const noop = async () => undefined;
export function AppearancePreview({
  config,
  title = "Your exam title",
  description = "Instructions for respondents",
  orgId,
  examDraft,
}: {
  examDraft?: ExamInput;
  config: Appearance;
  title?: string;
  description?: string | null;
  orgId: string;
}) {
  const [screen, setScreen] = useState("entry");
  const [mobile, setMobile] = useState(false);
  const model = useMemo(() => {
    const overview: PublicExamOverview = {
      appearance: config,
      publicId: "preview",
      title,
      description: description || null,
      durationMinutes: examDraft?.durationMinutes ?? 15,
      oneQuestionAtATime: true,
      preventFocusLoss: false,
      maxAttempts: examDraft?.maxAttempts ?? 3,
      requireEmail: examDraft?.requireEmail ?? false,
      requireIdentifier: examDraft?.requireIdentifier ?? false,
      availability:
        screen === "upcoming"
          ? "upcoming"
          : screen === "ended"
            ? "ended"
            : "open",
      startsAt:
        screen === "upcoming"
          ? new Date(Date.now() + 86400000).toISOString()
          : null,
      endsAt: null,
      serverTime: new Date().toISOString(),
      questionCount: examDraft?.questions?.length ?? 1,
      totalPoints: 1,
    };
    const attempt: PublicAttempt = {
      appearance: config,
      id: "appearance-preview",
      publicId: "preview",
      title,
      description: description || null,
      status:
        screen === "completed"
          ? "completed"
          : screen === "terminated"
            ? "terminated"
            : screen === "timed_out"
              ? "timed_out"
              : "in_progress",
      terminationReason: null,
      attemptNumber: 1,
      startedAt: new Date().toISOString(),
      completedAt: null,
      endedAt: null,
      isPreview: false,
      previewedByEmail: null,
      previewedByRole: null,
      remainingSeconds: (examDraft?.durationMinutes ?? 15) * 60,
      durationMinutes: examDraft?.durationMinutes ?? 15,
      oneQuestionAtATime: true,
      preventFocusLoss: false,
      reviewMode: "respondent_answers",
      startsAt: null,
      endsAt: null,
      sections: [],
      questions: [
        {
          id: "sample-question",
          sectionId: null,
          type: "single_choice",
          prompt: "Which option would you choose?",
          position: 0,
          required: true,
          points: 1,
          maxTimeSeconds: null,
          timeStartedAt: null,
          timeRemainingSeconds: null,
          timedOut: false,
          options: [
            { id: "a", label: "First option" },
            { id: "b", label: "Second option" },
          ],
          selectedAnswers: ["a"],
        },
      ],
    };
    return {
      overview,
      attempt: ["entry", "upcoming", "ended"].includes(screen) ? null : attempt,
      loading: false,
      error: null,
      savingQuestionId: null,
      syncStatus: "synced",
      unsyncedQuestionIds: [],
      unsyncedCount: 0,
      canSubmit: true,
      start: noop,
      saveAnswer: async () => true,
      activateQuestion: noop,
      expireQuestion: async () => true,
      submit: async () => true,
      retrySync: noop,
      startAnother: () => {},
    } as ReturnType<typeof usePublicExam>;
  }, [config, title, description, screen, examDraft]);
  return (
    <section className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Live appearance preview</h3>
        <div className="flex gap-2">
          <select
            aria-label="Preview screen"
            className="rounded-lg border p-2 text-xs"
            value={screen}
            onChange={(e) => setScreen(e.target.value)}
          >
            {[
              "entry",
              "questions",
              "completed",
              "upcoming",
              "ended",
              "terminated",
              "timed_out",
            ].map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-xs"
            onClick={() => setMobile(!mobile)}
          >
            {mobile ? "Fit container" : "Mobile"}
          </button>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        {examDraft ? "Entry uses your current exam settings; question screens use a sample question." : "Sample data only."} This preview creates no attempts.
      </p>
      <div className="min-w-0">
        <PreviewFrame mobile={mobile}>
          <fieldset disabled className="pointer-events-none m-0 min-w-0 border-0 p-0">
            <ExamAppearanceProvider
              config={config}
              preview
              previewOrgId={orgId}
            >
              <ExamContent exam={model} />
            </ExamAppearanceProvider>
          </fieldset>
        </PreviewFrame>
      </div>
    </section>
  );
}

function PreviewFrame({
  mobile,
  children,
}: {
  mobile: boolean;
  children: ReactNode;
}) {
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [height, setHeight] = useState(1);
  useEffect(() => {
    if (!body) return;
    const content = body.firstElementChild;
    if (!content) return;
    let frame = 0;
    const measure = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => setHeight(Math.ceil(content.getBoundingClientRect().height) + 2)); };
    const observer = new ResizeObserver(measure);
    observer.observe(content);
    measure();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [body]);
  return (
    <>
      <iframe
        title="Exam appearance preview"
        className="mx-auto block w-full max-w-full rounded-2xl border-0"
        style={{ maxWidth: mobile ? 390 : "100%", height }}
        srcDoc="<!doctype html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'></head><body style='margin:0;overflow:hidden'></body></html>"
        onLoad={(event) => {
          const doc = event.currentTarget.contentDocument;
          if (!doc) return;
          doc.head.querySelectorAll('link[rel="stylesheet"],style').forEach((node) => node.remove());
          document
            .querySelectorAll('link[rel="stylesheet"],style')
            .forEach((node) => doc.head.appendChild(node.cloneNode(true)));
          doc.body.className = document.body.className;
          setBody(doc.body);
        }}
      />
      {body && createPortal(children, body)}
    </>
  );
}
