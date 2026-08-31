'use client';

import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { publicExamsApi, type PublicAttempt, type PublicExamOverview } from '@/lib/api/exams';

export type ExamSyncStatus = 'synced' | 'saving' | 'retrying' | 'offline' | 'error';

interface QueuedAnswer {
  answer: string[];
  updatedAt: string;
}

function apiMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: { message?: string } }>(error)) return error.response?.data?.error?.message ?? error.message;
  return error instanceof Error ? error.message : 'Something went wrong.';
}

function isRetryable(error: unknown): boolean {
  if (!axios.isAxiosError(error) || !error.response) return true;
  return error.response.status === 408 || error.response.status === 425 || error.response.status === 429 || error.response.status >= 500;
}

function retryDelay(error: unknown, retryNumber: number): number {
  if (axios.isAxiosError(error)) {
    const value = error.response?.headers?.['retry-after'];
    if (typeof value === 'string') {
      const seconds = Number(value);
      if (Number.isFinite(seconds)) return Math.max(1000, seconds * 1000);
      const dateDelay = Date.parse(value) - Date.now();
      if (Number.isFinite(dateDelay) && dateDelay > 0) return dateDelay;
    }
  }
  return Math.min(15_000, 750 * (2 ** Math.min(retryNumber, 5))) + Math.floor(Math.random() * 300);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function sameAnswer(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
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
  const [syncStatus, setSyncStatus] = useState<ExamSyncStatus>('synced');
  const [unsyncedQuestionIds, setUnsyncedQuestionIds] = useState<string[]>([]);
  const lastViolationAtRef = useRef(0);
  const submittingRef = useRef(false);
  const accessTokenRef = useRef<string | null>(null);
  const attemptRef = useRef<PublicAttempt | null>(null);
  const queuedAnswersRef = useRef(new Map<string, QueuedAnswer>());
  const queueStorageKeyRef = useRef<string | null>(null);
  const syncLoopRef = useRef<Promise<void> | null>(null);
  const kickSyncRef = useRef<() => Promise<void>>(async () => undefined);
  const stoppedRef = useRef(false);
  const fatalSyncErrorRef = useRef(false);
  const tokenKey = `airunote_exam_attempt_${publicId}`;

  const updateAttempt = useCallback((next: PublicAttempt | ((current: PublicAttempt | null) => PublicAttempt | null)) => {
    setAttempt((current) => {
      const received = typeof next === 'function' ? next(current) : next;
      const value = received && queuedAnswersRef.current.size > 0 ? {
        ...received,
        questions: received.questions.map((question) => {
          const local = queuedAnswersRef.current.get(question.id);
          return local ? { ...question, selectedAnswers: local.answer } : question;
        }),
      } : received;
      attemptRef.current = value;
      return value;
    });
  }, []);

  const publishQueueState = useCallback(() => {
    setUnsyncedQuestionIds([...queuedAnswersRef.current.keys()]);
    if (queuedAnswersRef.current.size === 0) setSyncStatus('synced');
  }, []);

  const persistQueue = useCallback((): boolean => {
    const key = queueStorageKeyRef.current;
    if (!key) return false;
    try {
      if (queuedAnswersRef.current.size === 0) {
        window.localStorage.removeItem(key);
        return true;
      }
      window.localStorage.setItem(key, JSON.stringify(Object.fromEntries(queuedAnswersRef.current)));
      return true;
    } catch {
      return false;
    }
  }, []);

  const syncQueue = useCallback(async () => {
    let retryNumber = 0;
    while (!stoppedRef.current && queuedAnswersRef.current.size > 0) {
      if (fatalSyncErrorRef.current) break;
      const token = accessTokenRef.current;
      const next = queuedAnswersRef.current.entries().next().value as [string, QueuedAnswer] | undefined;
      if (!token || !next) break;
      const [questionId, queued] = next;
      setSavingQuestionId(questionId);
      setSyncStatus(retryNumber > 0 ? 'retrying' : 'saving');
      try {
        await publicExamsApi.saveAnswer(token, questionId, queued.answer);
        const current = queuedAnswersRef.current.get(questionId);
        if (current && current.updatedAt === queued.updatedAt && sameAnswer(current.answer, queued.answer)) queuedAnswersRef.current.delete(questionId);
        retryNumber = 0;
        setError(null);
        persistQueue();
        publishQueueState();
      } catch (caught) {
        if (!isRetryable(caught)) {
          fatalSyncErrorRef.current = true;
          setSyncStatus('error');
          setError(`This answer is saved on this device but the server rejected it: ${apiMessage(caught)}. Retry or contact the exam administrator.`);
          break;
        }
        retryNumber += 1;
        setSyncStatus(navigator.onLine ? 'retrying' : 'offline');
        setError(`Answer saved on this device. ${navigator.onLine ? 'The server is temporarily unavailable; retrying automatically.' : 'You appear to be offline; synchronization will resume when connected.'}`);
        await wait(retryDelay(caught, retryNumber));
      } finally {
        setSavingQuestionId((current) => current === questionId ? null : current);
      }
    }
    publishQueueState();
  }, [persistQueue, publishQueueState]);

  const kickSync = useCallback((): Promise<void> => {
    if (syncLoopRef.current) return syncLoopRef.current;
    const operation = syncQueue().finally(() => {
      syncLoopRef.current = null;
      if (!stoppedRef.current && !fatalSyncErrorRef.current && accessTokenRef.current && queuedAnswersRef.current.size > 0) {
        window.setTimeout(() => { void kickSyncRef.current(); }, 0);
      }
    });
    syncLoopRef.current = operation;
    return operation;
  }, [syncQueue]);
  kickSyncRef.current = kickSync;

  const retrySync = useCallback(() => {
    fatalSyncErrorRef.current = false;
    if (queuedAnswersRef.current.size > 0) {
      setSyncStatus(navigator.onLine ? 'retrying' : 'offline');
      void kickSync();
    }
  }, [kickSync]);

  const restoreQueue = useCallback((current: PublicAttempt) => {
    const key = `airunote_exam_unsynced_${current.id}`;
    queueStorageKeyRef.current = key;
    queuedAnswersRef.current.clear();
    try {
      const stored = JSON.parse(window.localStorage.getItem(key) ?? '{}') as Record<string, QueuedAnswer>;
      for (const [questionId, value] of Object.entries(stored)) {
        if (value && Array.isArray(value.answer) && typeof value.updatedAt === 'string') queuedAnswersRef.current.set(questionId, value);
      }
    } catch {
      window.localStorage.removeItem(key);
    }
    const restored = queuedAnswersRef.current.size === 0 ? current : {
      ...current,
      questions: current.questions.map((question) => {
        const local = queuedAnswersRef.current.get(question.id);
        return local ? { ...question, selectedAnswers: local.answer } : question;
      }),
    };
    updateAttempt(restored);
    publishQueueState();
    if (queuedAnswersRef.current.size > 0) {
      setSyncStatus(navigator.onLine ? 'retrying' : 'offline');
      void kickSync();
    }
  }, [kickSync, publishQueueState, updateAttempt]);

  useEffect(() => {
    stoppedRef.current = false;
    let active = true;
    void (async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams(window.location.search);
        const previewToken = query.get('preview');
        const queryToken = query.get('resume') || previewToken;
        const storedToken = queryToken || window.localStorage.getItem(tokenKey);
        const publicOverview = await publicExamsApi.overview(publicId);
        if (!active) return;
        setOverview(publicOverview);
        if (storedToken) {
          try {
            const current = await publicExamsApi.current(storedToken);
            if (!active) return;
            accessTokenRef.current = storedToken;
            setAccessToken(storedToken);
            restoreQueue(current);
            if (!previewToken) window.localStorage.setItem(tokenKey, storedToken);
            if (queryToken) window.history.replaceState({}, '', `/exam/${publicId}`);
          } catch (attemptError) {
            console.warn('Stored exam attempt could not be resumed', attemptError);
            if (!isRetryable(attemptError)) window.localStorage.removeItem(tokenKey);
            else setError('Your saved attempt could not reconnect to the server yet. Refresh when the connection is available; the resume token and device-saved answers have been retained.');
          }
        }
      } catch (caught) {
        if (active) setError(apiMessage(caught));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; stoppedRef.current = true; };
  }, [publicId, restoreQueue, tokenKey]);

  useEffect(() => {
    const online = () => retrySync();
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, [retrySync]);

  const start = useCallback(async (identity: { respondentName: string; respondentEmail?: string; respondentIdentifier?: string }) => {
    setError(null);
    setLoading(true);
    try {
      const result = await publicExamsApi.start(publicId, { ...identity, respondentEmail: identity.respondentEmail || null, respondentIdentifier: identity.respondentIdentifier || null, deviceId: getDeviceId() });
      accessTokenRef.current = result.accessToken;
      setAccessToken(result.accessToken);
      queueStorageKeyRef.current = `airunote_exam_unsynced_${result.attempt.id}`;
      queuedAnswersRef.current.clear();
      publishQueueState();
      updateAttempt(result.attempt);
      window.localStorage.setItem(tokenKey, result.accessToken);
    } catch (caught) {
      setError(apiMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [publicId, publishQueueState, tokenKey, updateAttempt]);

  const saveAnswer = useCallback(async (questionId: string, answer: string[]): Promise<boolean> => {
    if (!accessTokenRef.current || attemptRef.current?.status !== 'in_progress') return false;
    const queued: QueuedAnswer = { answer, updatedAt: new Date().toISOString() };
    const previous = queuedAnswersRef.current.get(questionId);
    queuedAnswersRef.current.set(questionId, queued);
    if (!persistQueue()) {
      if (previous) queuedAnswersRef.current.set(questionId, previous);
      else queuedAnswersRef.current.delete(questionId);
      publishQueueState();
      setSyncStatus('error');
      setError('This answer could not be saved on this device. Storage may be unavailable or full. The page will not advance; free browser storage or use Retry now.');
      return false;
    }
    publishQueueState();
    setSyncStatus(navigator.onLine ? 'saving' : 'offline');
    updateAttempt((current) => current ? { ...current, questions: current.questions.map((question) => question.id === questionId ? { ...question, selectedAnswers: answer } : question) } : current);
    fatalSyncErrorRef.current = false;
    void kickSync();
    return true;
  }, [kickSync, persistQueue, publishQueueState, updateAttempt]);

  const waitForSynchronization = useCallback(async (timeoutMs: number): Promise<boolean> => {
    fatalSyncErrorRef.current = false;
    void kickSync();
    const deadline = Date.now() + timeoutMs;
    while (queuedAnswersRef.current.size > 0 && Date.now() < deadline) await wait(150);
    return queuedAnswersRef.current.size === 0;
  }, [kickSync]);

  const activateQuestion = useCallback(async (questionId: string) => {
    const token = accessTokenRef.current;
    if (!token || attemptRef.current?.status !== 'in_progress') return;
    try { setError(null); updateAttempt(await publicExamsApi.activateQuestion(token, questionId)); }
    catch (caught) { setError(apiMessage(caught)); }
  }, [updateAttempt]);

  const expireQuestion = useCallback(async (questionId: string, answer: string[]) => {
    const token = accessTokenRef.current;
    if (!token || attemptRef.current?.status !== 'in_progress') return false;
    setSavingQuestionId(questionId);
    try {
      updateAttempt(await publicExamsApi.expireQuestion(token, questionId, answer));
      queuedAnswersRef.current.delete(questionId);
      persistQueue();
      publishQueueState();
      return true;
    } catch (caught) {
      await saveAnswer(questionId, answer);
      setError(`The timed answer is saved on this device but has not reached the server: ${apiMessage(caught)}`);
      return false;
    } finally { setSavingQuestionId((current) => current === questionId ? null : current); }
  }, [persistQueue, publishQueueState, saveAnswer, updateAttempt]);

  const submit = useCallback(async (): Promise<boolean> => {
    const token = accessTokenRef.current;
    if (!token || submittingRef.current) return false;
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const synchronized = await waitForSynchronization(20_000);
      if (!synchronized || queuedAnswersRef.current.size > 0) {
        setError(`Cannot submit yet: ${queuedAnswersRef.current.size} answer${queuedAnswersRef.current.size === 1 ? '' : 's'} still need to reach the server. Your work is safe on this device—check the connection and retry.`);
        return false;
      }
      const completed = await publicExamsApi.submit(token);
      if (queuedAnswersRef.current.size > 0) {
        setError('A new unsynchronized answer appeared during submission. Please submit again after it saves.');
        return false;
      }
      updateAttempt(completed);
      const key = queueStorageKeyRef.current;
      if (key) window.localStorage.removeItem(key);
      setSyncStatus('synced');
      return true;
    } catch (caught) {
      setError(`Exam was not submitted: ${apiMessage(caught)}`);
      return false;
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }, [updateAttempt, waitForSynchronization]);

  useEffect(() => {
    const token = accessToken;
    if (!token || attempt?.status !== 'in_progress') return;
    const heartbeat = window.setInterval(() => { void publicExamsApi.event(token, 'heartbeat').catch(() => undefined); }, 30_000);
    return () => window.clearInterval(heartbeat);
  }, [accessToken, attempt?.status]);

  useEffect(() => {
    const token = accessToken;
    if (!token || attempt?.status !== 'in_progress') return;
    const reportFocusLoss = () => {
      if (submittingRef.current || Date.now() - lastViolationAtRef.current < 1500) return;
      lastViolationAtRef.current = Date.now();
      void publicExamsApi.event(token, 'focus_lost', { visibilityState: document.visibilityState }).then(updateAttempt).catch((caught) => setError(apiMessage(caught)));
    };
    const visibility = () => { if (document.visibilityState === 'hidden') reportFocusLoss(); };
    window.addEventListener('blur', reportFocusLoss);
    document.addEventListener('visibilitychange', visibility);
    return () => { window.removeEventListener('blur', reportFocusLoss); document.removeEventListener('visibilitychange', visibility); };
  }, [accessToken, attempt?.status, updateAttempt]);

  useEffect(() => {
    if (attempt?.status !== 'in_progress') return;
    const timer = window.setInterval(() => updateAttempt((current) => current?.status === 'in_progress' ? { ...current, remainingSeconds: Math.max(0, current.remainingSeconds - 1), questions: current.questions.map((question) => question.timeStartedAt && !question.timedOut && question.timeRemainingSeconds !== null ? { ...question, timeRemainingSeconds: Math.max(0, question.timeRemainingSeconds - 1) } : question) } : current), 1000);
    return () => window.clearInterval(timer);
  }, [attempt?.status, updateAttempt]);

  useEffect(() => {
    if (attempt?.status === 'in_progress' && attempt.remainingSeconds === 0 && unsyncedQuestionIds.length === 0) void submit();
  }, [attempt?.remainingSeconds, attempt?.status, submit, unsyncedQuestionIds.length]);

  const startAnother = () => {
    window.localStorage.removeItem(tokenKey);
    const queueKey = queueStorageKeyRef.current;
    if (queueKey) window.localStorage.removeItem(queueKey);
    queuedAnswersRef.current.clear();
    queueStorageKeyRef.current = null;
    accessTokenRef.current = null;
    attemptRef.current = null;
    syncLoopRef.current = null;
    submittingRef.current = false;
    setAccessToken(null);
    setAttempt(null);
    setError(null);
    setSyncStatus('synced');
    setUnsyncedQuestionIds([]);
  };

  return {
    overview, attempt, loading, error, savingQuestionId, syncStatus,
    unsyncedQuestionIds, unsyncedCount: unsyncedQuestionIds.length,
    canSubmit: unsyncedQuestionIds.length === 0 && syncStatus === 'synced',
    start, saveAnswer, activateQuestion, expireQuestion, submit, retrySync, startAnother,
  };
}
