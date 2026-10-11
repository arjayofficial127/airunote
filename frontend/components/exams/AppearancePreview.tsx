"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ExamAppearanceProvider } from "./ExamAppearanceProvider";
import { ExamContent } from "./PublicExamPage";
import type { usePublicExam } from "./usePublicExam";
import type { Appearance } from "@/lib/exam-appearance";
import type { PublicExamOverview, PublicAttempt, ExamInput } from "@/lib/api/exams";
import { PreviewGallery } from "./PreviewGallery";
export const previewScreens = ["entry", "instructions", "questions", "date", "completed", "upcoming", "ended", "terminated", "timed_out"] as const;
export interface PreviewProps { config: Appearance; title?: string; description?: string | null; orgId: string; examDraft?: ExamInput; }
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
  const stepScreen = (direction: number) => setScreen(current => {
    const index = previewScreens.findIndex(value => value === current);
    return previewScreens[(index + direction + previewScreens.length) % previewScreens.length];
  });
  const [mobile, setMobile] = useState(false);
  const [gallery, setGallery] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const fullscreenButton = useRef<HTMLButtonElement>(null);
  const exitFullscreen = useCallback(() => {
    setFullscreen(false);
    fullscreenButton.current?.focus();
  }, []);
  useEffect(() => {
    if (!fullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') exitFullscreen();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [fullscreen, exitFullscreen]);
  return (
    <section className={fullscreen ? "fixed inset-0 z-[100] min-w-0 space-y-3 overflow-auto bg-slate-50 p-4 text-slate-900" : "min-w-0 space-y-3"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Live appearance preview</h3>
        <div className="flex flex-wrap items-center gap-2">
          {!gallery && <div className="flex items-center gap-1" role="group" aria-label="Preview screen navigation">
          <button type="button" className="h-11 rounded-lg border bg-white px-3 text-xs hover:bg-slate-100" aria-label="Previous preview screen" onClick={() => stepScreen(-1)}>← Back</button>
          <select aria-label="Preview screen" className="h-11 rounded-lg border bg-white px-3 text-xs" value={screen} onChange={e => setScreen(e.target.value)}>
            {previewScreens.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          <button type="button" className="h-11 rounded-lg border bg-white px-3 text-xs hover:bg-slate-100" aria-label="Next preview screen" onClick={() => stepScreen(1)}>Next →</button>
          </div>}
          <button ref={fullscreenButton} type="button" className="preview-tool" aria-label={fullscreen ? 'Exit fullscreen' : 'Expand preview in browser panel'} title={fullscreen ? 'Exit fullscreen' : 'Expand preview in browser panel'} onClick={() => {
            if (fullscreen) { exitFullscreen(); return; }
            setFullscreen(true);
          }}><PreviewIcon kind={fullscreen ? 'collapse' : 'expand'} /></button>
          <button type="button" className="preview-tool" aria-label={mobile ? 'Switch to desktop preview' : 'Switch to iPhone preview'} title={mobile ? 'Switch to desktop preview' : 'Switch to iPhone preview'} onClick={() => setMobile(!mobile)}><PreviewIcon kind={mobile ? 'desktop' : 'phone'} /></button>
          <button type="button" className="preview-tool" aria-label={gallery ? 'Single screen view' : 'Gallery view'} title={gallery ? 'Single screen view' : 'Gallery view'} aria-pressed={gallery} onClick={() => setGallery(!gallery)}><PreviewIcon kind="gallery" /></button>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        {examDraft ? "Entry uses your current exam settings; question screens use a sample question." : "Sample data only."} This preview creates no attempts.
      </p>
      {gallery ? <PreviewGallery key={mobile ? 'phone' : 'desktop'} mobile={mobile} fullscreen={fullscreen} renderScreen={state => <PreviewScreen config={config} title={title} description={description} orgId={orgId} examDraft={examDraft} screen={state} mobile={mobile} fullscreen={false} gallery onEscape={exitFullscreen} />} />
        : <PreviewScreen config={config} title={title} description={description} orgId={orgId} examDraft={examDraft} screen={screen} mobile={mobile} fullscreen={fullscreen} onEscape={exitFullscreen} />}
    </section>
  );
}

function PreviewIcon({ kind }: { kind: 'expand' | 'collapse' | 'phone' | 'desktop' | 'gallery' }) {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === 'expand' && <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />}
    {kind === 'collapse' && <path d="M3 8h5V3m13 5h-5V3M8 21v-5H3m13 5v-5h5" />}
    {kind === 'phone' && <><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M10 5h4m-3 14h2" /></>}
    {kind === 'desktop' && <><rect x="2" y="3" width="20" height="14" rx="2" /><path d="M12 17v4m-4 0h8" /></>}
    {kind === 'gallery' && <><rect x="2" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="16" rx="1" /><path d="M19 4h3v16h-3" /></>}
  </svg>;
}

function PreviewScreen({ config, title = 'Your exam title', description, orgId, examDraft, screen, mobile, fullscreen, gallery = false, onEscape }: PreviewProps & { screen: string; mobile: boolean; fullscreen: boolean; gallery?: boolean; onEscape: () => void }) {
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
          type: screen === "date" ? "date" : "single_choice",
          prompt: screen === "date" ? "Date (YYYY-MM-DD)" : "Which option would you choose?",
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
          selectedAnswers: screen === "date" ? [] : ["a"],
        },
      ],
    };
    return {
      overview,
      attempt: ["entry", "instructions", "upcoming", "ended"].includes(screen) ? null : attempt,
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
  return <PreviewFrame mobile={mobile} fullscreen={fullscreen} gallery={gallery} onEscape={onEscape}>
    <fieldset  style={{ '--exam-preview-page-height': mobile || fullscreen || gallery ? '100dvh' : '0px', '--exam-terminal-height': mobile || fullscreen || gallery ? '100dvh' : '720px' } as CSSProperties} className="m-0 min-w-0 border-0 p-0">
      <ExamAppearanceProvider config={config} preview previewOrgId={orgId}>
        <ExamContent key={`${screen}-${config.renderer}`} exam={model} previewInstructions={screen === "instructions"} />
      </ExamAppearanceProvider>
    </fieldset>
  </PreviewFrame>;
}

function PreviewFrame({
  mobile,
  gallery,
  fullscreen,
  onEscape,
  children,
}: {
  mobile: boolean;
  gallery: boolean;
  fullscreen: boolean;
  onEscape: () => void;
  children: ReactNode;
}) {
  const [body, setBody] = useState<HTMLElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const mountFrame = () => {
    const doc = frameRef.current?.contentDocument;
    if (!doc?.body) return;
    doc.head.querySelectorAll('link[rel="stylesheet"],style').forEach(node => node.remove());
    document.querySelectorAll('link[rel="stylesheet"],style').forEach(node => doc.head.appendChild(node.cloneNode(true)));
    doc.body.className = document.body.className;
    setBody(doc.body);
  };
  useEffect(() => {
    // srcDoc may finish loading before React hydrates and attaches onLoad.
    if (frameRef.current?.contentDocument?.readyState === 'complete') mountFrame();
  }, []);

  const [height, setHeight] = useState(1);
  useEffect(() => {
    if (body) body.style.overflow = fullscreen || mobile || gallery ? 'auto' : 'hidden';
  }, [body, fullscreen, mobile, gallery]);
  useEffect(() => {
    if (!body) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape();
    };
    body.ownerDocument.addEventListener('keydown', escape);
    return () => body.ownerDocument.removeEventListener('keydown', escape);
  }, [body, onEscape]);
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
    <div className={mobile ? "exam-phone-demo" : "exam-desktop-demo"}>
      {mobile && <div className="exam-phone-status" aria-hidden="true"><span>9:41</span><span className="exam-phone-island" /><span>▮▮▮ ▰</span></div>}
      <iframe
        ref={frameRef}
        title="Exam appearance preview"
        tabIndex={0}
        className="mx-auto block w-full max-w-full rounded-2xl border-0"
        style={{ maxWidth: "100%", height: mobile ? 760 : gallery ? 1080 : fullscreen ? "calc(100dvh - 150px)" : height }}
        srcDoc="<!doctype html><html><head><meta name='viewport' content='width=device-width, initial-scale=1'></head><body style='margin:0;overflow:hidden'></body></html>"
        onLoad={mountFrame}
      />
      {mobile && <><div className="exam-phone-home" aria-hidden="true"><span /></div><p className="exam-phone-caption">iPhone 18 · Demo mockup</p></>}
      {body && createPortal(children, body)}
    </div>
  );
}
