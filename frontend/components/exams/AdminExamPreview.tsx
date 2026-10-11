'use client';

import { useEffect, useRef, useState } from 'react';
import { examsApi, type ExamDefinition, type PublicExamOverview } from '@/lib/api/exams';
import { appearanceApi, apiError } from '@/lib/api/appearance';
import type { Appearance } from '@/lib/exam-appearance';
import { ExamAppearanceProvider } from './ExamAppearanceProvider';
import { ExamContent } from './PublicExamPage';
import type { usePublicExam } from './usePublicExam';

/** The authenticated preview starts at the entrance; no timed attempt exists until Start exam. */
export function AdminExamPreview({ orgId, examId }: { orgId: string; examId: string }) {
  const [data, setData] = useState<{ exam: ExamDefinition; appearance: Appearance }>();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  useEffect(() => {
    let active = true;
    if (!orgId || !examId) { setError('This admin preview link is incomplete.'); return; }
    void Promise.all([examsApi.get(orgId, examId), appearanceApi.get(orgId, examId)])
      .then(([exam, appearance]) => { if (active) setData({ exam, appearance: appearance.config }); })
      .catch(reason => { if (active) setError(apiError(reason)); });
    return () => { active = false; };
  }, [orgId, examId]);

  const startPreview = async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    setError(null);
    try {
      const result = await examsApi.preview(orgId, examId);
      window.location.assign(result.path);
    } catch (reason) {
      setError(apiError(reason));
      setStarting(false);
      startingRef.current = false;
    }
  };

  if (!data) return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-sm" role="status">{error ? 'Sign in to Airunote with an administrator account to open this preview. For access without signing in, ask for a public preview code.' : 'Preparing admin preview…'}</main>;
  const overview: PublicExamOverview = {
    ...data.exam,
    appearance: data.appearance,
    availability: data.exam.startsAt && Date.parse(data.exam.startsAt) > Date.now() ? 'upcoming' : data.exam.endsAt && Date.parse(data.exam.endsAt) <= Date.now() ? 'ended' : 'open',
    serverTime: new Date().toISOString(),
    questionCount: data.exam.questions.length,
    totalPoints: data.exam.questions.reduce((sum, question) => sum + (question.graded ? question.points : 0), 0),
  };
  const model = { overview, attempt: null, loading: starting, error } as ReturnType<typeof usePublicExam>;
  return <>
    <div className="bg-violet-50 px-4 py-2 text-center text-xs text-violet-900">Admin preview · Main page → Instructions → Exam. Start exam creates a graded Admin Attempt in PreviewAttempts. All exam rules apply; attempts are unlimited.</div>
    <ExamAppearanceProvider config={data.appearance} preview previewOrgId={orgId}>
      <ExamContent exam={model} onPreviewStart={() => void startPreview()} />
    </ExamAppearanceProvider>
  </>;
}
