'use client';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import apiClient from '@/lib/api/client';
import { OrgSessionContext } from '@/providers/OrgSessionProvider';
import { MetadataIndexContext } from '@/providers/MetadataIndexProvider';
import { HydratedContentContext } from '@/providers/HydratedContentProvider';
import type { ExamDefinition, ExamReport, ExamInput } from '@/lib/api/exams';
import type { ExamAppearance } from '@/lib/api/appearance';
import { creatorAppearance, plainAppearance } from '@/lib/exam-appearance';
import { LocalAdminNavigation } from './AdminNavigation';
import { ExamDashboard } from './ExamDashboard';
import { ExamBuilder } from './ExamBuilder';
import { ExamReports } from './ExamReports';
import { ExamTemplates } from './ExamTemplates';
import { ExamJourneySettings } from './ExamJourneySettings';
import { NativeFileLibrary } from '@/components/files/NativeFileLibrary';
import { AdminWorkspace } from './AdminWorkspace';
const orgId = '10000000-0000-4000-8000-000000000001';
const examId = '20000000-0000-4000-8000-000000000001';
const sectionId = '30000000-0000-4000-8000-000000000001';
const now = () => new Date().toISOString();
function initialExam(): ExamDefinition {
  return {
    id: examId,
    orgId,
    createdByUserId: 'local-user',
    title: 'Local sample · FY27 Holiday Promotion',
    description:
      'This is a local sample for reviewing the admin interface. Read each question carefully and select the correct answer. Your real exam content is unchanged.',
    status: 'draft',
    publicId: 'local-admin-sample',
    durationMinutes: 15,
    oneQuestionAtATime: true,
    preventFocusLoss: true,
    maxAttempts: 3,
    reviewMode: 'respondent_answers',
    shuffleQuestions: true,
    shuffleOptions: true,
    requireEmail: false,
    requireIdentifier: true,
    startsAt: null,
    endsAt: null,
    archivedAt: null,
    archivedByUserId: null,
    createdAt: now(),
    updatedAt: now(),
    attemptCount: 0,
    sections: [
      {
        id: sectionId,
        title: 'Knowledge',
        description: null,
        position: 0,
        pinned: false,
      },
    ],
    questions: [
      'single_choice',
      'multiple_choice',
      'true_false',
      'short_text',
      'date',
    ].map((type, i) => ({
      id: `40000000-0000-4000-8000-00000000000${i}`,
      examId,
      sectionId,
      type: type as ExamDefinition['questions'][number]['type'],
      prompt: `Sample question ${i + 1} · ${type.replaceAll('_', ' ')}`,
      explanation: null,
      position: i,
      required: true,
      graded: false,
      points: 1,
      pinned: false,
      maxTimeSeconds: null,
      correctAnswers: [],
      options: type.includes('choice')
        ? [
            { id: crypto.randomUUID(), label: 'Option A', position: 0 },
            { id: crypto.randomUUID(), label: 'Option B', position: 1 },
          ]
        : [],
    })),
  };
}
function materialize(base: ExamDefinition, input: ExamInput): ExamDefinition {
  const sectionIds = new Map<string, string>();
  const sections = (input.sections ?? base.sections).map(
    (section, position) => {
      const id = section.id || crypto.randomUUID();
      if ('key' in section && section.key) sectionIds.set(section.key, id);
      sectionIds.set(id, id);
      return {
        ...section,
        id,
        position,
        description: section.description ?? null,
        pinned: section.pinned ?? false,
      };
    },
  );
  const questions = (input.questions ?? base.questions).map(
    (question, position) => {
      const optionIds = new Map<string, string>();
      const options = (question.options ?? []).map((option, index) => {
        const id = option.id || crypto.randomUUID();
        if ('key' in option && option.key) optionIds.set(option.key, id);
        optionIds.set(id, id);
        return { ...option, id, position: index };
      });
      const reference =
        question.sectionId ||
        ('sectionKey' in question ? question.sectionKey : null);
      return {
        ...question,
        id: question.id || crypto.randomUUID(),
        examId: base.id,
        position,
        sectionId: reference ? sectionIds.get(reference) || reference : null,
        options,
        correctAnswers: (question.correctAnswers ?? []).map(
          (answer) => optionIds.get(answer) || answer,
        ),
        explanation: question.explanation ?? null,
        required: question.required ?? true,
        graded: question.graded ?? false,
        points: question.points ?? 1,
        pinned: question.pinned ?? false,
        maxTimeSeconds: question.maxTimeSeconds ?? null,
      };
    },
  );
  return { ...base, ...input, sections, questions };
}
function makeReport(exam: ExamDefinition): ExamReport {
  return {
    exam,
    generatedAt: now(),
    summary: {
      totalAttempts: 1,
      completed: 0,
      inProgress: 0,
      terminated: 1,
      needsAdmin: 1,
      activeNow: 0,
      inactiveStale: 0,
      timedOut: 0,
      voided: 0,
      previews: 0,
    },
    respondents: [
      {
        id: 'local-attempt',
        respondentName: 'Sample respondent',
        respondentEmail: 'sample@example.test',
        respondentIdentifier: 'LOCAL-001',
        attemptNumber: 1,
        status: 'terminated',
        classification: 'focus_terminated',
        terminationReason: 'focus_loss',
        focusViolationCount: 1,
        startedAt: now(),
        completedAt: null,
        endedAt: now(),
        lastActiveAt: now(),
        timeInExamSeconds: 242,
        remainingSeconds: 658,
        active: false,
        needsAdmin: true,
        eligibleForContinue: true,
        activeQuestionId: null,
        earnedPoints: 0,
        possiblePoints: 5,
        percentage: 0,
        scoreIsProvisional: true,
        answers: {},
        isPreview: false,
        previewedByEmail: null,
        previewedByRole: null,
        voidedAt: null,
        voidReason: null,
      },
    ],
    questionPerformance: exam.questions
      .filter((q) => !q.entryField)
      .map((q) => ({
        questionId: q.id,
        prompt: q.prompt,
        graded: q.graded,
        points: q.points,
        answeredCount: 0,
        skippedCount: 1,
        correctCount: 0,
        incorrectCount: 0,
        averageResponseSeconds: null,
        correctPercentage: null,
        correctRespondents: [],
        incorrectRespondents: [],
        optionPerformance: q.options.map((o) => ({
          optionId: o.id,
          label: o.label,
          selectedCount: 0,
          selectedPercentage: 0,
          correct: false,
          respondents: [],
        })),
      })),
    recentEvents: [],
  };
}
export function LocalAdminSandbox() {
  const exams = useRef<ExamDefinition[]>([]);
  const appearances = useRef<Record<string, ExamAppearance>>({
    [examId]: {
      config: structuredClone(creatorAppearance),
      templateId: null,
      revision: 1,
    },
  });
  const templates = useRef<import('@/lib/api/appearance').ExamTemplate[]>([
    {
      id: 'local-theme',
      name: 'Local Creator theme',
      config: structuredClone(creatorAppearance),
      revision: 1,
      archivedAt: null,
    },
  ]);
  const defaultId = useRef<string | null>(null);
  const report = useRef<ExamReport | null>(null);
  const [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState('library');
  const [notice, setNotice] = useState('');
  const [selectedId, setSelectedId] = useState(examId);
  const [failure, setFailure] = useState(false);
  const failRef = useRef(failure);
  failRef.current = failure;
  const settings = useRef({
    journeyMode: 'exam_first' as 'exam_first' | 'standard',
    visibleTopLevelApps: ['exams', 'airunote'] as ('exams' | 'airunote')[],
  });
  const push = useCallback((href: string) => {
    const p = new URL(href, window.location.origin).pathname;
    const found = exams.current.find((e) => p.includes(e.id));
    if (found) setSelectedId(found.id);
    setScreen(
      p.endsWith('/reports')
        ? 'reports'
        : p.endsWith('/exam-templates')
          ? 'templates'
          : p.endsWith('/files')
            ? 'files'
            : p.endsWith('/settings')
              ? 'settings'
              : p.endsWith('/exams')
                ? 'library'
                : 'builder',
    );
  }, []);
  useEffect(() => {
    exams.current = [initialExam()];
    report.current = makeReport(exams.current[0]);
    const interceptor = apiClient.interceptors.request.use((config) => {
      if (!config.url?.startsWith(`/orgs/${orgId}/`)) return config;
      config.adapter = async (request) => {
        const p = request.url!,
          method = (request.method || 'get').toLowerCase();
        const input =
          typeof request.data === 'string'
            ? JSON.parse(request.data)
            : request.data;
        let data: unknown = {};
        const found =
          exams.current.find((e) => p.includes(e.id)) ?? exams.current[0];
        if (method !== 'get' && failRef.current)
          throw new Error('Local simulated failure. No data was saved.');
        if (p.endsWith('/exams/settings')) {
          if (method !== 'get') settings.current = input;
          data = settings.current;
        } else if (p.includes('/appearance/exams/')) {
          const savedAppearance = appearances.current[found.id] ?? {
            config: structuredClone(plainAppearance),
            templateId: null,
            revision: 1,
          };
          if (method === 'put')
            appearances.current[found.id] = {
              ...input,
              revision: savedAppearance.revision + 1,
            };
          data = appearances.current[found.id] ?? savedAppearance;
        } else if (p.endsWith('/appearance/templates')) {
          if (method === 'post') {
            const t = {
              id: crypto.randomUUID(),
              ...input,
              revision: 1,
              archivedAt: null,
            };
            templates.current.push(t);
            data = t;
          } else
            data = {
              templates: templates.current,
              defaultTemplateId: defaultId.current,
            };
        } else if (p.includes('/appearance/templates/')) {
          const t = templates.current.find((t) => p.includes(t.id));
          if (t) {
            if (p.endsWith('/archive')) t.archivedAt = now();
            else Object.assign(t, input, { revision: t.revision + 1 });
            data = t;
          }
        } else if (p.endsWith('/appearance/default')) {
          defaultId.current = input.templateId;
        } else if (p.endsWith('/access-code') || p.endsWith('/preview-code'))
          data =
            method === 'get'
              ? { enabled: false }
              : { code: input.enabled ? '12345678' : null, path: '/dev/admin' };
        else if (p.endsWith('/definition')) {
          Object.assign(found, materialize(found, input));
          data = found;
        } else if (p.endsWith('/grading')) {
          const q = found.questions.find((q) => p.includes(q.id));
          if (q) Object.assign(q, input);
          data = q;
        } else if (p.endsWith('/report')) {
          if (!report.current) report.current = makeReport(found);
          report.current.exam = found;
          data = report.current;
        } else if (p.endsWith('/continue'))
          data = { path: '/dev/admin?local-continuation=sample' };
        else if (p.endsWith('/void')) {
          const r = report.current?.respondents[0];
          if (r) {
            r.classification = 'void';
            r.voidReason = input.reason;
            r.eligibleForContinue = false;
          }
          data = {};
        } else if (p.endsWith('/duplicate')) {
          const duplicate = structuredClone(found);
          duplicate.id = crypto.randomUUID();
          duplicate.title += ' copy';
          duplicate.attemptCount = 0;
          duplicate.archivedAt = null;
          appearances.current[duplicate.id] = structuredClone(
            appearances.current[found.id] ?? {
              config: plainAppearance,
              templateId: null,
              revision: 1,
            },
          );
          exams.current.push(duplicate);
          data = duplicate;
        } else if (p.endsWith('/archive')) found.archivedAt = now();
        else if (p.endsWith('/restore')) found.archivedAt = null;
        else if (
          p.endsWith('/exams/import') ||
          (p.endsWith('/exams') && method === 'post')
        ) {
          const created = initialExam();
          created.id = crypto.randomUUID();
          Object.assign(created, materialize(created, input));
          const defaultTemplate = templates.current.find(
            (t) => t.id === defaultId.current && !t.archivedAt,
          );
          appearances.current[created.id] = {
            config: structuredClone(defaultTemplate?.config ?? plainAppearance),
            templateId: defaultTemplate?.id ?? null,
            revision: 1,
          };
          exams.current.push(created);
          data = created;
        } else if (p.endsWith('/exams'))
          data = exams.current.filter((e) =>
            request.params?.archived ? !!e.archivedAt : !e.archivedAt,
          );
        else if (p.endsWith('/files/capabilities'))
          data = { uploadsAvailable: false, maxBytes: 10485760, types: [] };
        else if (p.endsWith('/files') || p.endsWith('/files/cleanup'))
          data = [];
        else data = found;
        if (method !== 'get') setRevision((x) => x + 1);
        return {
          data: { success: true, data: structuredClone(data) },
          status: 200,
          statusText: 'OK',
          headers: {},
          config: request,
        };
      };
      return config;
    });
    setReady(true);
    return () => apiClient.interceptors.request.eject(interceptor);
  }, []);
  const refresh = useCallback(async () => {
    setRevision((x) => x + 1);
  }, []);
  if (!ready)
    return <main className="p-8">Preparing local admin sandbox…</main>;
  const selected =
    exams.current.find((e) => e.id === selectedId) ?? exams.current[0];
  const orgValue: NonNullable<
    ComponentProps<typeof OrgSessionContext.Provider>['value']
  > = {
    status: 'ready',
    orgs: [],
    activeOrgId: orgId,
    activeOrg: {
      id: orgId,
      name: 'Local admin sandbox',
      slug: 'local-admin',
      description: null,
      isActive: true,
      createdAt: now(),
      roles: ['admin'],
    },
    orgUser: { orgId, userId: 'local-user', roles: ['admin'] },
    roles: ['admin'],
    isRefreshing: false,
    hasAuthoritativeData: true,
    error: null,
    setActiveOrg: () => {},
    refetch: refresh,
  };
  const metadata: NonNullable<
    ComponentProps<typeof MetadataIndexContext.Provider>['value']
  > = {
    status: 'ready',
    activeOrgId: orgId,
    index: {
      posts: [],
      collections: [],
      files: [],
      exams: exams.current.filter((e) => !e.archivedAt),
      examSettings: settings.current,
    },
    error: null,
    refreshAll: refresh,
    refreshKey: refresh,
  };
  const hydrated: NonNullable<
    ComponentProps<typeof HydratedContentContext.Provider>['value']
  > = {
    status: 'ready',
    hydrate: async () => {},
    getHydrated: <T,>(type: string, id: string) =>
      (type === 'examReport'
        ? report.current
        : exams.current.find((e) => e.id === id)) as T | null,
    isHydrated: () => true,
    isHydrating: () => false,
    clearHydrated: () => {},
    clearEntity: () => {},
    refreshEntity: refresh,
    error: null,
  };
  return (
    <LocalAdminNavigation.Provider value={{ push }}>
      <OrgSessionContext.Provider value={orgValue}>
        <MetadataIndexContext.Provider value={metadata}>
          <HydratedContentContext.Provider value={hydrated}>
            <main
              data-local-revision={revision}
              onClickCapture={(e) => {
                const a = (e.target as HTMLElement).closest<HTMLAnchorElement>(
                  'a[href]',
                );
                if (a && new URL(a.href).pathname.startsWith('/exam/')) {
                  e.preventDefault();
                  setNotice(
                    'Connected public exams and saved admin tests are disabled here. Use Visual preview.',
                  );
                  return;
                }
                if (
                  a?.href.includes(`/orgs/${orgId}/`) &&
                  a.target !== '_blank'
                ) {
                  e.preventDefault();
                  push(a.href);
                }
              }}
            >
              <header className="border-b border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
                <details open={screen !== 'reports'}>
                  <summary className="min-h-8 cursor-pointer font-semibold">
                    Local sandbox · Sample data only
                  </summary>
                  <>
                    {notice && (
                      <p role="status" className="mb-3 font-semibold">
                        {notice}
                      </p>
                    )}
                    <b>Local admin sandbox</b>
                  </>{' '}
                  · Sample data only. Saves stay in memory and reset on refresh.
                  No sandbox operation reaches the backend.
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label>
                      <input
                        type="checkbox"
                        checked={failure}
                        onChange={(e) => setFailure(e.target.checked)}
                      />{' '}
                      Simulate save failure
                    </label>
                    <button
                      type="button"
                      className="rounded-lg border px-3 py-2"
                      onClick={() => {
                        selected.attemptCount = selected.attemptCount ? 0 : 1;
                        setRevision((x) => x + 1);
                      }}
                    >
                      {' '}
                      {selected.attemptCount
                        ? 'Unlock sample structure'
                        : 'Simulate existing attempts'}
                    </button>
                  </div>
                  <p className="mt-2 text-xs">
                    Admin test/public exam links need a connected API; use
                    Visual preview here. Generated sandbox codes and
                    continuation links are illustrative.
                  </p>
                </details>
              </header>
              {screen === 'library' ? (
                <ExamDashboard />
              ) : screen === 'builder' ? (
                <ExamBuilder key={selected.id} examId={selected.id} />
              ) : screen === 'reports' ? (
                <ExamReports examId={selected.id} />
              ) : screen === 'templates' ? (
                <ExamTemplates />
              ) : screen === 'files' ? (
                <AdminWorkspace current="Files">
                  <div className="p-6">
                    <NativeFileLibrary />
                  </div>
                </AdminWorkspace>
              ) : (
                <ExamJourneySettings orgId={orgId} />
              )}
            </main>
          </HydratedContentContext.Provider>
        </MetadataIndexContext.Provider>
      </OrgSessionContext.Provider>
    </LocalAdminNavigation.Provider>
  );
}
