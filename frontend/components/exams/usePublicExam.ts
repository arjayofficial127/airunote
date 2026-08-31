'use client';

import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { publicExamsApi, type PublicAttempt, type PublicExamOverview } from '@/lib/api/exams';

function apiMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: { message?: string } }>(error)) return error.response?.data?.error?.message ?? error.message;
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function getDeviceId(): string {
  const key = 'airunote_exam_device_id';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(key, created);
  return created;
}

export function usePublicExam(publicId: string) {
  const [overview, setOverview] = useState<PublicExamOverview | null>(null);
  const [attempt, setAttempt] = useState<PublicAttempt | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const lastViolationAtRef = useRef(0);
  const pendingSavesRef = useRef<Promise<void>>(Promise.resolve());
  const submittingRef = useRef(false);
  const tokenKey = `airunote_exam_attempt_${publicId}`;

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      try {
        const queryToken = new URLSearchParams(window.location.search).get('resume');
        const storedToken = queryToken || window.localStorage.getItem(tokenKey);
        const publicOverview = await publicExamsApi.overview(publicId);
        if (!active) return;
        setOverview(publicOverview);
        if (storedToken) {
          try {
            const current = await publicExamsApi.current(storedToken);
            if (!active) return;
            setAccessToken(storedToken);
            setAttempt(current);
            window.localStorage.setItem(tokenKey, storedToken);
            if (queryToken) window.history.replaceState({}, '', `/exam/${publicId}`);
          } catch (attemptError) {
            console.warn('Stored exam attempt could not be resumed', attemptError);
            window.localStorage.removeItem(tokenKey);
          }
        }
      } catch (caught) {
        if (active) setError(apiMessage(caught));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [publicId, tokenKey]);

  const start = useCallback(async (identity: { respondentName: string; respondentEmail?: string; respondentIdentifier?: string }) => {
    setError(null);
    setLoading(true);
    try {
      const result = await publicExamsApi.start(publicId, {
        ...identity,
        respondentEmail: identity.respondentEmail || null,
        respondentIdentifier: identity.respondentIdentifier || null,
        deviceId: getDeviceId(),
      });
      setAccessToken(result.accessToken);
      setAttempt(result.attempt);
      window.localStorage.setItem(tokenKey, result.accessToken);
    } catch (caught) {
      setError(apiMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [publicId, tokenKey]);

  const saveAnswer = useCallback(async (questionId: string, answer: string[]) => {
    if (!accessToken || !attempt || attempt.status !== 'in_progress') return;
    setSavingQuestionId(questionId);
    setError(null);
    setAttempt((current) => current ? {
      ...current,
      questions: current.questions.map((question) => question.id === questionId ? { ...question, selectedAnswers: answer } : question),
    } : current);
    const saveOperation = pendingSavesRef.current
      .catch(() => undefined)
      .then(async () => {
        await publicExamsApi.saveAnswer(accessToken, questionId, answer);
      });
    pendingSavesRef.current = saveOperation;
    try {
      await saveOperation;
    } catch (caught) {
      setError(`Answer was not saved: ${apiMessage(caught)}`);
    } finally {
      setSavingQuestionId((current) => current === questionId ? null : current);
    }
  }, [accessToken, attempt]);

  const activateQuestion = useCallback(async (questionId: string) => {
    if (!accessToken || attempt?.status !== 'in_progress') return;
    try {
      setError(null);
      setAttempt(await publicExamsApi.activateQuestion(accessToken, questionId));
    } catch (caught) {
      setError(apiMessage(caught));
    }
  }, [accessToken, attempt?.status]);

  const expireQuestion = useCallback(async (questionId: string, answer: string[]) => {
    if (!accessToken || attempt?.status !== 'in_progress') return false;
    setSavingQuestionId(questionId);
    try {
      await pendingSavesRef.current.catch(() => undefined);
      setAttempt(await publicExamsApi.expireQuestion(accessToken, questionId, answer));
      return true;
    } catch (caught) {
      setError(`The question timer expired, but its last answer could not be saved: ${apiMessage(caught)}`);
      return false;
    } finally {
      setSavingQuestionId((current) => current === questionId ? null : current);
    }
  }, [accessToken, attempt?.status]);

  const submit = useCallback(async () => {
    if (!accessToken || submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      await pendingSavesRef.current;
      setAttempt(await publicExamsApi.submit(accessToken));
    } catch (caught) {
      setError(apiMessage(caught));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken || attempt?.status !== 'in_progress') return;
    const heartbeat = window.setInterval(() => {
      void publicExamsApi.event(accessToken, 'heartbeat').catch(() => undefined);
    }, 30_000);
    return () => window.clearInterval(heartbeat);
  }, [accessToken, attempt?.status]);

  useEffect(() => {
    if (!accessToken || attempt?.status !== 'in_progress') return;
    const reportFocusLoss = () => {
      if (submittingRef.current) return;
      if (Date.now() - lastViolationAtRef.current < 1500) return;
      lastViolationAtRef.current = Date.now();
      void publicExamsApi.event(accessToken, 'focus_lost', {
        visibilityState: document.visibilityState,
      }).then(setAttempt).catch((caught) => setError(apiMessage(caught)));
    };
    const visibility = () => { if (document.visibilityState === 'hidden') reportFocusLoss(); };
    window.addEventListener('blur', reportFocusLoss);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('blur', reportFocusLoss);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [accessToken, attempt?.status]);

  useEffect(() => {
    if (attempt?.status !== 'in_progress') return;
    const timer = window.setInterval(() => {
      setAttempt((current) => current?.status === 'in_progress' ? {
        ...current,
        remainingSeconds: Math.max(0, current.remainingSeconds - 1),
        questions: current.questions.map((question) => question.timeStartedAt && !question.timedOut && question.timeRemainingSeconds !== null
          ? { ...question, timeRemainingSeconds: Math.max(0, question.timeRemainingSeconds - 1) }
          : question),
      } : current);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [attempt?.status]);

  useEffect(() => {
    if (attempt?.status === 'in_progress' && attempt.remainingSeconds === 0) void submit();
  }, [attempt?.remainingSeconds, attempt?.status, submit]);

  const startAnother = () => {
    window.localStorage.removeItem(tokenKey);
    pendingSavesRef.current = Promise.resolve();
    submittingRef.current = false;
    setAccessToken(null);
    setAttempt(null);
    setError(null);
  };

  return { overview, attempt, loading, error, savingQuestionId, start, saveAnswer, activateQuestion, expireQuestion, submit, startAnother };
}
