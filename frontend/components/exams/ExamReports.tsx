'use client';

import { useLocalAdminSandbox } from './AdminNavigation';
import { AdminWorkspace } from './AdminWorkspace';
import { AdminDialog } from './AdminDialog';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  examsApi,
  type ExamQuestion,
  type ExamReport,
  type ExamReportRespondent,
} from '@/lib/api/exams';
import { useHydratedContent } from '@/providers/HydratedContentProvider';
import { useOrgSession } from '@/providers/OrgSessionProvider';

interface ExamReportsProps {
  examId: string;
}
type ReportTab = 'live' | 'matrix' | 'questions';
type SummaryFilter = 'all' | 'active' | 'submitted' | 'needs_admin';
type SortKey =
  | 'respondentName'
  | 'classification'
  | 'startedAt'
  | 'endedAt'
  | 'timeInExamSeconds'
  | 'percentage'
  | 'focusViolationCount'
  | 'lastActiveAt';

function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;
  return hours
    ? `${hours}h ${minutes}m ${remainder}s`
    : `${minutes}m ${remainder}s`;
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString() : '—';
}

function formatStarted(value: string | null): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return `${date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
}

function AttemptDateTime({
  value,
  emptyLabel,
}: {
  value: string | null;
  emptyLabel: string;
}) {
  if (!value)
    return <span className="text-xs italic text-slate-400">{emptyLabel}</span>;
  const date = new Date(value);
  return (
    <time
      dateTime={value}
      title={date.toLocaleString()}
      className="block min-w-36"
    >
      <span className="block font-medium text-slate-800">
        {date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </span>
      <span className="mt-1 block whitespace-nowrap text-xs text-slate-500">
        {date.toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short',
        })}
      </span>
    </time>
  );
}

function answerText(question: ExamQuestion, answers: string[]): string {
  if (answers.length === 0) return '—';
  return answers
    .map(
      (answer) =>
        question.options.find((option) => option.id === answer)?.label ??
        answer,
    )
    .join(', ');
}

function answerCorrect(
  question: ExamQuestion,
  answers: string[],
): boolean | null {
  if (
    !question.graded ||
    question.correctAnswers.length === 0 ||
    answers.length === 0
  )
    return null;
  const actual = [...answers].sort();
  const expected = [...question.correctAnswers].sort();
  return (
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

function statusLabel(value: string): string {
  return (
    (
      {
        active: 'Active',
        inactive_stale: 'Inactive / stale',
        focus_terminated: 'Focus-terminated',
        timed_out: 'Timed out',
        abandoned: 'Abandoned',
        submitted: 'Submitted',
        terminated: 'Interrupted',
        void: 'Void',
      } as Record<string, string>
    )[value] ?? value.replaceAll('_', ' ')
  );
}

function statusClass(value: string): string {
  if (value === 'submitted') return 'bg-emerald-50 text-emerald-700';
  if (value === 'active') return 'bg-blue-50 text-blue-700';
  if (value === 'void') return 'bg-slate-100 text-slate-500';
  if (value === 'timed_out') return 'bg-violet-50 text-violet-700';
  return 'bg-amber-50 text-amber-700';
}

function escapeCsv(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function AttemptDetail({
  respondent,
  questions,
  onClose,
}: {
  respondent: ExamReportRespondent;
  questions: ExamQuestion[];
  onClose: () => void;
}) {
  return (
    <AdminDialog
      title={`Attempt #${respondent.attemptNumber}`}
      onClose={onClose}
    >
      <section className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <header className="sticky top-0 flex items-start justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
              Attempt #{respondent.attemptNumber}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">
              {respondent.respondentName}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {respondent.respondentEmail ||
                respondent.respondentIdentifier ||
                'No secondary identifier'}
            </p>
          </div>
        </header>
        <div className="grid gap-3 border-b border-slate-100 p-6 text-sm sm:grid-cols-2">
          <p>
            <span className="text-slate-500">Status:</span>{' '}
            {statusLabel(respondent.classification)}
          </p>
          <p>
            <span className="text-slate-500">Duration:</span>{' '}
            {formatDuration(respondent.timeInExamSeconds)}
          </p>
          <p>
            <span className="text-slate-500">Started:</span>{' '}
            {formatDate(respondent.startedAt)}
          </p>
          <p>
            <span className="text-slate-500">Ended:</span>{' '}
            {formatDate(respondent.endedAt)}
          </p>
          <p>
            <span className="text-slate-500">Last seen:</span>{' '}
            {formatDate(respondent.lastActiveAt)}
          </p>
          <p>
            <span className="text-slate-500">Focus events:</span>{' '}
            {respondent.focusViolationCount}
          </p>
          {respondent.isPreview && (
            <p className="sm:col-span-2 rounded-lg bg-violet-50 px-3 py-2 text-violet-700">
              {respondent.previewedByRole === 'PreviewCoded'
                ? 'Preview Coded'
                : 'Admin Attempt'}{' '}
              · {respondent.previewedByEmail} · {respondent.previewedByRole}
            </p>
          )}
          {respondent.voidReason && (
            <p className="sm:col-span-2 rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
              Void reason: {respondent.voidReason}
            </p>
          )}
        </div>
        <div className="space-y-3 p-6">
          {questions.map((question, index) => {
            const answers = respondent.answers[question.id] ?? [];
            const correct = answerCorrect(question, answers);
            return (
              <article
                key={question.id}
                className={`rounded-xl border p-4 ${correct === true ? 'border-emerald-200 bg-emerald-50/40' : correct === false ? 'border-red-200 bg-red-50/40' : 'border-slate-200'}`}
              >
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Question {index + 1}
                </p>
                <h3 className="mt-1 font-medium text-slate-900">
                  {question.prompt}
                </h3>
                <p className="mt-3 text-sm text-slate-700">
                  <span className="font-medium">Answer:</span>{' '}
                  {answerText(question, answers)}
                </p>
                {question.graded && (
                  <p className="mt-1 text-xs text-slate-500">
                    Result:{' '}
                    {correct === null
                      ? 'Skipped / not scorable'
                      : correct
                        ? 'Correct'
                        : 'Incorrect'}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </AdminDialog>
  );
}

export function ExamReports({ examId }: ExamReportsProps) {
  const localSandbox = useLocalAdminSandbox();
  const orgSession = useOrgSession();
  const {
    getHydrated,
    hydrate,
    refreshEntity,
    error: reportError,
  } = useHydratedContent();
  const [advanced, setAdvanced] = useState(false);
  const [allColumns, setAllColumns] = useState(false);
  const [mobileTable, setMobileTable] = useState(false);
  const [recovery, setRecovery] = useState<{
    row: ExamReportRespondent;
    kind: 'continue' | 'void';
  } | null>(null);
  const [reason, setReason] = useState('');
  const [recoveryDone, setRecoveryDone] = useState(false);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [continueLink, setContinueLink] = useState('');
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [tab, setTab] = useState<ReportTab>('live');
  const [message, setMessage] = useState<string | null>(null);
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [scoreMin, setScoreMin] = useState('');
  const [scoreMax, setScoreMax] = useState('');
  const [completedDate, setCompletedDate] = useState('');
  const [focusOnly, setFocusOnly] = useState(false);
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);
  const [includeVoids, setIncludeVoids] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('startedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedAttempt, setSelectedAttempt] =
    useState<ExamReportRespondent | null>(null);
  const [anonymized, setAnonymized] = useState(false);
  const [matrixResult, setMatrixResult] = useState<
    'all' | 'correct' | 'incorrect' | 'skipped'
  >('all');
  const orgId = orgSession.activeOrgId;
  const report = getHydrated<ExamReport>('examReport', examId);

  useEffect(() => {
    void hydrate('examReport', examId);
  }, [examId, hydrate]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      // Keep an open attempt/menu stable while the admin is interacting.
      if (
        document.hidden ||
        selectedAttempt ||
        recovery ||
        document.querySelector(
          '.admin-reports details.report-action-menu[open], .admin-reports details.report-attempt-menu[open]',
        )
      )
        return;
      void refreshEntity('examReport', examId);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [examId, refreshEntity, selectedAttempt, recovery]);

  const questionById = useMemo(
    () =>
      new Map(
        report?.exam.questions.map((question) => [question.id, question]) ?? [],
      ),
    [report],
  );
  const filtered = useMemo(() => {
    if (!report) return [];
    const query = search.trim().toLocaleLowerCase();
    const rows = report.respondents.filter((row) => {
      if (!includeVoids && row.classification === 'void') return false;
      if (summaryFilter === 'active' && !row.active) return false;
      if (summaryFilter === 'submitted' && row.classification !== 'submitted')
        return false;
      if (summaryFilter === 'needs_admin' && !row.needsAdmin) return false;
      if (status !== 'all' && row.classification !== status) return false;
      if (
        query &&
        ![
          row.respondentName,
          row.respondentEmail,
          row.respondentIdentifier,
          `attempt ${row.attemptNumber}`,
          row.classification,
        ].some((value) => value?.toLocaleLowerCase().includes(query))
      )
        return false;
      if (scoreMin && (row.percentage ?? -1) < Number(scoreMin)) return false;
      if (scoreMax && (row.percentage ?? 101) > Number(scoreMax)) return false;
      if (
        completedDate &&
        (!row.endedAt ||
          `${new Date(row.endedAt).getFullYear()}-${String(new Date(row.endedAt).getMonth() + 1).padStart(2, '0')}-${String(new Date(row.endedAt).getDate()).padStart(2, '0')}` !==
            completedDate)
      )
        return false;
      if (focusOnly && row.focusViolationCount === 0) return false;
      if (needsReviewOnly && !row.needsAdmin) return false;
      return true;
    });
    return [...rows].sort((left, right) => {
      const leftValue = left[sortKey] ?? '';
      const rightValue = right[sortKey] ?? '';
      const comparison =
        typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [
    completedDate,
    focusOnly,
    includeVoids,
    needsReviewOnly,
    report,
    scoreMax,
    scoreMin,
    search,
    sortDirection,
    sortKey,
    status,
    summaryFilter,
  ]);

  const openRecovery = (
    row: ExamReportRespondent,
    kind: 'continue' | 'void',
  ) => {
    setRecovery({ row, kind });
    setRecoveryDone(false);
    setReason('');
    setContinueLink('');
    setRecoveryMessage('');
  };
  const copyContinue = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setRecoveryMessage(
        'Continue link copied. Five additional minutes; the old link is invalid.',
      );
    } catch {
      setRecoveryMessage(
        'Link generated. Clipboard unavailable: select and copy the link below. Do not generate it again.',
      );
    }
  };
  const performRecovery = async () => {
    if (!orgId || !recovery) return;
    setRecoveryBusy(true);
    setRecoveryMessage('');
    try {
      if (recovery.kind === 'continue') {
        const result = await examsApi.continueAttempt(
          orgId,
          examId,
          recovery.row.id,
          5,
        );
        const link = `${window.location.origin}${result.path}`;
        setContinueLink(link);
        await copyContinue(link);
      } else {
        await examsApi.voidAttempt(
          orgId,
          examId,
          recovery.row.id,
          reason.trim(),
        );
        setRecoveryDone(true);
        setRecoveryMessage(
          'Attempt voided. History retained and attempt allowance released.',
        );
      }
      await refreshEntity('examReport', examId);
    } catch {
      setRecoveryMessage(
        'The operation or report refresh did not complete. Your reason and any generated link remain here. Check the report before retrying.',
      );
    } finally {
      setRecoveryBusy(false);
    }
  };
  useEffect(() => {
    if (!orgId) return;
    try {
      const p = JSON.parse(
        sessionStorage.getItem(`exam-report:${orgId}:${examId}`) || '{}',
      );
      setSearch(p.search || '');
      setStatus(p.status || 'all');
      setScoreMin(p.scoreMin || '');
      setScoreMax(p.scoreMax || '');
      setCompletedDate(p.completedDate || '');
      setFocusOnly(!!p.focusOnly);
      setNeedsReviewOnly(!!p.needsReviewOnly);
      setIncludeVoids(!!p.includeVoids);
      setAdvanced(!!p.advanced);
      setAllColumns(!!p.allColumns);
      setMobileTable(
        p.mobileTable === undefined ? !!p.allColumns : !!p.mobileTable,
      );
      if (
        [
          'respondentName',
          'classification',
          'startedAt',
          'endedAt',
          'timeInExamSeconds',
          'percentage',
          'focusViolationCount',
          'lastActiveAt',
        ].includes(p.sortKey)
      )
        setSortKey(p.sortKey);
      if (p.sortDirection === 'asc' || p.sortDirection === 'desc')
        setSortDirection(p.sortDirection);
      if (['live', 'matrix', 'questions'].includes(p.tab)) setTab(p.tab);
      if (
        ['all', 'active', 'submitted', 'needs_admin'].includes(p.summaryFilter)
      )
        setSummaryFilter(p.summaryFilter);
    } catch {}
    setPreferencesReady(true);
  }, [orgId, examId]);
  useEffect(() => {
    if (orgId && preferencesReady)
      try {
        sessionStorage.setItem(
          `exam-report:${orgId}:${examId}`,
          JSON.stringify({
            search,
            status,
            scoreMin,
            scoreMax,
            completedDate,
            focusOnly,
            needsReviewOnly,
            includeVoids,
            tab,
            summaryFilter,
            sortKey,
            sortDirection,
            advanced,
            allColumns,
            mobileTable,
          }),
        );
      } catch {}
  }, [
    orgId,
    examId,
    preferencesReady,
    search,
    status,
    scoreMin,
    scoreMax,
    completedDate,
    focusOnly,
    needsReviewOnly,
    includeVoids,
    tab,
    summaryFilter,
    sortKey,
    sortDirection,
    advanced,
    allColumns,
    mobileTable,
  ]);

  const openPreview = () => {
    if (localSandbox) {
      setMessage(
        'Saved admin tests require a connected backend. Use Visual preview from the sandbox editor.',
      );
      return;
    }
    if (!orgId) return;
    window.open(
      `/exam/admin-preview?org=${encodeURIComponent(orgId)}&exam=${encodeURIComponent(examId)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const exportRows = filtered
    .filter((row) => !row.isPreview)
    .map((row) => ({
      Name: row.respondentName,
      Email: row.respondentEmail ?? '',
      Identifier: row.respondentIdentifier ?? '',
      Attempt: row.attemptNumber,
      Status: statusLabel(row.classification),
      Started: formatDate(row.startedAt),
      Ended: formatDate(row.endedAt),
      'Last seen': formatDate(row.lastActiveAt),
      'Duration seconds': row.timeInExamSeconds,
      'Earned points': row.earnedPoints,
      'Possible points': row.possiblePoints,
      Percentage: row.percentage ?? '',
      'Focus events': row.focusViolationCount,
      Preview: row.isPreview ? 'Yes' : 'No',
      'Void reason': row.voidReason ?? '',
    }));
  const exportCsv = () => {
    if (!exportRows.length) return;
    const headers = Object.keys(exportRows[0]);
    const csv = [
      headers.map(escapeCsv).join(','),
      ...exportRows.map((row) =>
        headers
          .map((header) => escapeCsv(row[header as keyof typeof row]))
          .join(','),
      ),
    ].join('\r\n');
    downloadBlob(
      `${report?.exam.publicId ?? 'exam'}-attempts.csv`,
      new Blob([csv], { type: 'text/csv;charset=utf-8' }),
    );
  };
  const exportXlsx = async () => {
    const { Workbook } = await import('exceljs');
    const workbook = new Workbook();
    const attemptsSheet = workbook.addWorksheet('Attempts');
    const headers = exportRows.length ? Object.keys(exportRows[0]) : [];
    attemptsSheet.columns = headers.map((header) => ({
      header,
      key: header,
      width: Math.max(14, Math.min(40, header.length + 4)),
    }));
    exportRows.forEach((row) => attemptsSheet.addRow(row));
    if (report) {
      const analytics = workbook.addWorksheet('Question analytics');
      analytics.columns = [
        { header: 'Question', key: 'question', width: 12 },
        { header: 'Prompt', key: 'prompt', width: 60 },
        { header: 'Answered', key: 'answered', width: 12 },
        { header: 'Skipped', key: 'skipped', width: 12 },
        { header: 'Correct', key: 'correct', width: 12 },
        { header: 'Incorrect', key: 'incorrect', width: 12 },
        { header: 'Accuracy', key: 'accuracy', width: 12 },
        { header: 'Average seconds', key: 'averageSeconds', width: 18 },
      ];
      report.questionPerformance.forEach((item, index) =>
        analytics.addRow({
          question: index + 1,
          prompt: item.prompt,
          answered: item.answeredCount,
          skipped: item.skippedCount,
          correct: item.correctCount,
          incorrect: item.incorrectCount,
          accuracy: item.correctPercentage ?? '',
          averageSeconds: item.averageResponseSeconds ?? '',
        }),
      );
    }
    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(
      `${report?.exam.publicId ?? 'exam'}-report.xlsx`,
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
    );
  };

  const changeSort = (key: SortKey) => {
    if (sortKey === key)
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };
  const sortHeader = (label: string, key: SortKey) => (
    <button
      type="button"
      onClick={() => changeSort(key)}
      className="whitespace-nowrap font-semibold"
    >
      {label} {sortKey === key ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
    </button>
  );

  if (!report)
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-slate-500">
        Building live report…
      </div>
    );
  const active = report.respondents.filter(
    (row) => row.active && !row.isPreview && row.classification !== 'void',
  );
  const stats: Array<{
    label: string;
    value: number;
    color: string;
    filter: SummaryFilter;
  }> = [
    {
      label: 'Attempts',
      value: report.summary.totalAttempts,
      color: 'text-slate-950',
      filter: 'all',
    },
    {
      label: 'Active now',
      value: report.summary.activeNow,
      color: 'text-blue-700',
      filter: 'active',
    },
    {
      label: 'Submitted',
      value: report.summary.completed,
      color: 'text-emerald-700',
      filter: 'submitted',
    },
    {
      label: 'Needs admin',
      value: report.summary.needsAdmin,
      color: 'text-amber-700',
      filter: 'needs_admin',
    },
  ];

  const clearFilters = () => {
    setSummaryFilter('all');
    setSearch('');
    setStatus('all');
    setScoreMin('');
    setScoreMax('');
    setCompletedDate('');
    setFocusOnly(false);
    setNeedsReviewOnly(false);
    setIncludeVoids(false);
  };
  const filterCount = [
    !!scoreMin,
    !!scoreMax,
    !!completedDate,
    focusOnly,
    needsReviewOnly,
    includeVoids,
  ].filter(Boolean).length;
  const hasFilters =
    !!search || status !== 'all' || summaryFilter !== 'all' || filterCount > 0;
  const needsAttention = report.respondents.filter(
    (row) => row.needsAdmin && !row.isPreview && row.classification !== 'void',
  );
  return (
    <AdminWorkspace>
      <div
        className="admin-reports min-h-full bg-slate-50 px-4 py-6 sm:px-8 lg:px-10"
        data-columns={allColumns ? 'all' : 'compact'}
        data-mobile-table={mobileTable}
      >
        <div className="mx-auto max-w-[1500px]">
          <header className="report-context-header">
            <div>
              <Link
                href={`/orgs/${orgId}/exams/${examId}`}
                className="text-sm font-medium text-blue-700"
              >
                ← Back to editor
              </Link>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                {report.exam.title}
              </h1>
              <p className="report-refresh-status mt-2 text-sm text-slate-500">
                {reportError ? 'Refresh unavailable · Last updated' : 'Updated'}{' '}
                {new Date(report.generatedAt).toLocaleTimeString(undefined, {
                  timeZoneName: 'short',
                })}{' '}
                ·{' '}
                {selectedAttempt || recovery
                  ? 'Auto-refresh paused while reviewing'
                  : 'Refreshes every 5s'}
              </p>
            </div>
            <div className="report-header-actions">
              <details className="report-action-menu">
                <summary>Export report</summary>
                <div>
                  {' '}
                  <button
                    type="button"
                    disabled={!exportRows.length}
                    title="Filtered respondent attempts; preview attempts excluded"
                    onClick={exportCsv}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    title="Filtered respondent attempts plus full question analytics"
                    onClick={() =>
                      void exportXlsx().catch(() =>
                        setMessage(
                          'Could not export XLSX. Your report is unchanged; retry the download.',
                        ),
                      )
                    }
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium"
                  >
                    Export XLSX
                  </button>
                  <p>
                    CSV: filtered participant attempts. XLSX: those attempts
                    plus full question analytics. Tests are excluded.
                  </p>
                </div>
              </details>
              <button
                type="button"
                onClick={() => void refreshEntity('examReport', examId)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium"
              >
                Refresh
              </button>
              <details className="report-action-menu">
                <summary>More actions</summary>
                <div>
                  {' '}
                  <button
                    type="button"
                    onClick={() => void openPreview()}
                    className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-800"
                  >
                    Saved admin test
                  </button>
                  <Link
                    href={`/exam/${report.exam.publicId}`}
                    target="_blank"
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Open public exam
                  </Link>
                </div>
              </details>
            </div>
          </header>
          <nav
            aria-label="Report views"
            className="admin-exam-tabs report-view-tabs flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
          >
            {(
              [
                ['live', 'Live attempts'],
                ['matrix', 'Answer matrix'],
                ['questions', 'Question analytics'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
                className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === id ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
              >
                {label}
              </button>
            ))}
          </nav>
          {reportError && (
            <p role="alert" className="admin-notice admin-warning">
              Report refresh is unavailable. Showing the last received data.{' '}
              <button
                type="button"
                onClick={() => void refreshEntity('examReport', examId)}
              >
                Retry refresh
              </button>
            </p>
          )}
          {message && (
            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              {message}
            </div>
          )}
          <section
            className="report-metric-strip"
            aria-label="Filter attempts by summary"
          >
            {stats.map((item) => (
              <button
                key={item.label}
                type="button"
                aria-pressed={summaryFilter === item.filter}
                onClick={() => setSummaryFilter(item.filter)}
                className={`admin-report-stat border bg-white text-left ${summaryFilter === item.filter ? 'border-blue-400' : 'border-slate-200'}`}
              >
                <p className="text-xs font-semibold text-slate-500">
                  {item.label}
                </p>
                <p className={`text-2xl font-semibold ${item.color}`}>
                  {item.value}
                </p>
              </button>
            ))}
          </section>
          {tab === 'live' && needsAttention.length > 0 && (
            <section
              className="report-attention"
              aria-label="Attempts needing admin attention"
            >
              <div className="report-attention-heading">
                <h2>
                  {needsAttention.length}{' '}
                  {needsAttention.length === 1
                    ? 'attempt needs'
                    : 'attempts need'}{' '}
                  your attention
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    clearFilters();
                    setSummaryFilter('needs_admin');
                  }}
                >
                  Show all needing admin
                </button>
              </div>
              {needsAttention.slice(0, 2).map((row) => (
                <div className="report-attention-row" key={row.id}>
                  <div>
                    <b>{row.respondentName}</b>
                    <small>
                      {statusLabel(row.classification)} · Attempt #
                      {row.attemptNumber} ·{' '}
                      {row.respondentIdentifier ||
                        row.respondentEmail ||
                        'No secondary identifier'}
                    </small>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => setSelectedAttempt(row)}
                      className="rounded-lg border px-3 py-2"
                    >
                      Review attempt
                    </button>
                    {row.eligibleForContinue && (
                      <button
                        type="button"
                        onClick={() => openRecovery(row, 'continue')}
                        className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white"
                      >
                        Continue +5 min
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </section>
          )}
          <section
            className="report-filter-toolbar"
            aria-label="Report filters"
          >
            <div className="report-primary-filters">
              {' '}
              <input
                aria-label="Search respondents"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, employee ID, attempt, status…"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <select
                aria-label="Attempt status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="all">All statuses</option>
                {[
                  'active',
                  'inactive_stale',
                  'focus_terminated',
                  'timed_out',
                  'abandoned',
                  'submitted',
                  'terminated',
                  'void',
                ].map((value) => (
                  <option key={value} value={value}>
                    {statusLabel(value)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-expanded={advanced}
                onClick={() => setAdvanced(!advanced)}
                className="rounded-lg border px-3 py-2"
              >
                Filters{filterCount ? ` (${filterCount})` : ''}
              </button>
              {tab === 'live' && (
                <label className="report-view-select">
                  <span>View</span>
                  <select
                    aria-label="Attempt view"
                    value={
                      mobileTable
                        ? allColumns
                          ? 'full'
                          : 'essential'
                        : 'grouped'
                    }
                    onChange={(event) => {
                      setMobileTable(event.target.value !== 'grouped');
                      setAllColumns(event.target.value === 'full');
                    }}
                  >
                    <option value="grouped">Grouped</option>
                    <option value="essential">Essential table</option>
                    <option value="full">Full table</option>
                  </select>
                </label>
              )}
            </div>
            <div className="report-filter-status">
              <span>
                {filtered.filter((row) => !row.isPreview).length} participant
                attempts · {filtered.filter((row) => row.isPreview).length} test
                attempts
              </span>
              {tab === 'live' && (
                <div className="report-sort-control">
                  <label>
                    Sort{' '}
                    <select
                      aria-label="Sort attempts"
                      value={sortKey}
                      onChange={(event) =>
                        setSortKey(event.target.value as SortKey)
                      }
                    >
                      {(
                        [
                          ['startedAt', 'Latest started'],
                          ['respondentName', 'Name'],
                          ['percentage', 'Score'],
                          ['timeInExamSeconds', 'Duration'],
                          ['classification', 'Status'],
                          ['focusViolationCount', 'Focus events'],
                          ['endedAt', 'Ended'],
                          ['lastActiveAt', 'Last seen'],
                        ] as const
                      ).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    aria-label={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
                    onClick={() =>
                      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
                    }
                  >
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              )}
              {hasFilters && (
                <button
                  type="button"
                  className="font-semibold text-blue-700"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              )}
            </div>
            <div hidden={!advanced} className="report-advanced-filters">
              {' '}
              <input
                aria-label="Minimum score percentage"
                type="number"
                min="0"
                max="100"
                value={scoreMin}
                onChange={(event) => setScoreMin(event.target.value)}
                placeholder="Min score %"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                aria-label="Maximum score percentage"
                type="number"
                min="0"
                max="100"
                value={scoreMax}
                onChange={(event) => setScoreMax(event.target.value)}
                placeholder="Max score %"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <label className="text-xs">
                Completed on · device timezone
                <input
                  type="date"
                  value={completedDate}
                  onChange={(event) => setCompletedDate(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <div className="report-filter-checks text-slate-700">
                <label>
                  <input
                    type="checkbox"
                    checked={focusOnly}
                    onChange={(event) => setFocusOnly(event.target.checked)}
                    className="mr-1"
                  />
                  Focus events
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={needsReviewOnly}
                    onChange={(event) =>
                      setNeedsReviewOnly(event.target.checked)
                    }
                    className="mr-1"
                  />
                  Needs review
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={includeVoids}
                    onChange={(event) => setIncludeVoids(event.target.checked)}
                    className="mr-1"
                  />
                  Include void ({report.summary.voided})
                </label>
              </div>
            </div>
          </section>
          {tab === 'live' && (
            <div className="space-y-6">
              {active.length === 0 && (
                <p className="report-monitor-idle">
                  Nobody answering now <span>· Updates automatically</span>
                </p>
              )}
              <details
                hidden={active.length === 0}
                className="report-live-monitor rounded-xl border border-slate-200 bg-white"
                open={active.length > 0}
              >
                <summary>
                  <b>Answering now</b>
                  <span>
                    {active.length
                      ? `${active.length} active`
                      : 'Nobody active'}
                  </span>
                  <small>Heartbeat or answer received within 45 seconds</small>
                </summary>
                {active.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-500">
                    Nobody is actively answering right now.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {active.map((row) => {
                      const index = report.exam.questions.findIndex(
                        (question) => question.id === row.activeQuestionId,
                      );
                      return (
                        <button
                          type="button"
                          key={row.id}
                          onClick={() => setSelectedAttempt(row)}
                          className="grid w-full gap-3 px-6 py-4 text-left sm:grid-cols-[1fr_auto_auto] sm:items-center"
                        >
                          <div>
                            <p className="font-medium text-slate-900">
                              {row.respondentName}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Attempt #{row.attemptNumber} ·{' '}
                              {
                                Object.values(row.answers).filter(
                                  (answer) => answer.length,
                                ).length
                              }
                              /{report.exam.questions.length} answered ·{' '}
                              {index >= 0 ? `near Q${index + 1}` : 'starting'}
                            </p>
                          </div>
                          <span className="text-sm text-slate-600">
                            Last seen{' '}
                            {new Date(row.lastActiveAt).toLocaleTimeString()}
                          </span>
                          <span className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700">
                            {formatDuration(row.remainingSeconds)} left
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </details>
              {[false, true].map((previewTable) => (
                <details
                  open={!previewTable}
                  key={String(previewTable)}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <summary className="report-attempts-heading">
                    <b className="text-slate-950">
                      {previewTable
                        ? 'Preview attempts'
                        : 'Participant attempts'}{' '}
                      (
                      {
                        filtered.filter((row) => row.isPreview === previewTable)
                          .length
                      }
                      )
                    </b>
                    <small>
                      Device timezone · Records retained
                      {previewTable
                        ? ' · Excluded from participant exports'
                        : ''}
                    </small>
                  </summary>
                  {!filtered.some((row) => row.isPreview === previewTable) && (
                    <div className="report-empty">
                      <b>
                        {previewTable
                          ? 'No matching test attempts'
                          : 'No matching participant attempts'}
                      </b>
                      <p>
                        {hasFilters
                          ? 'Your filters exclude all records in this view.'
                          : 'New attempts will appear here automatically.'}
                      </p>
                      {hasFilters && (
                        <button type="button" onClick={clearFilters}>
                          Clear filters
                        </button>
                      )}
                    </div>
                  )}
                  <div className="admin-report-cards">
                    <div
                      className="report-group-head"
                      aria-label="Sort grouped attempts"
                    >
                      <div>Identity</div>
                      <div>Score &amp; attempt</div>
                      <div>Duration &amp; events</div>
                      <div>Status &amp; actions</div>
                    </div>
                    {filtered
                      .filter((row) => row.isPreview === previewTable)
                      .map((row) => (
                        <article
                          key={row.id}
                          className={`report-group-row ${row.classification === 'void' ? 'opacity-75' : ''}`}
                        >
                          <div className="report-group-cell">
                            <span className="report-group-label">Identity</span>
                            <button
                              type="button"
                              className="text-left font-semibold"
                              onClick={() => setSelectedAttempt(row)}
                            >
                              {row.respondentName}
                            </button>
                            {row.respondentIdentifier && (
                              <small>ID · {row.respondentIdentifier}</small>
                            )}
                            {row.respondentEmail && (
                              <small>{row.respondentEmail}</small>
                            )}
                            {row.isPreview && (
                              <small className="text-violet-700">
                                {row.previewedByRole === 'PreviewCoded'
                                  ? 'Preview Coded'
                                  : 'Admin Attempt'}
                              </small>
                            )}
                          </div>
                          <div className="report-group-cell">
                            <span className="report-group-label">
                              Score &amp; attempt
                            </span>
                            <strong className="report-group-score">
                              {row.scoreIsProvisional
                                ? 'Provisional'
                                : row.percentage === null
                                  ? 'Pending grade'
                                  : `${row.percentage}%`}
                            </strong>
                            <small>
                              {row.earnedPoints}/{row.possiblePoints} points ·
                              Attempt #{row.attemptNumber}
                            </small>
                          </div>
                          <div className="report-group-cell">
                            <span className="report-group-label">
                              Duration &amp; events
                            </span>
                            <div className="report-duration-line">
                              <b>{formatDuration(row.timeInExamSeconds)}</b>
                              <span aria-hidden="true">·</span>
                              <span
                                className={`report-group-events ${row.focusViolationCount > 0 ? 'text-amber-700' : 'text-emerald-700'}`}
                              >
                                {row.focusViolationCount} focus{' '}
                                {row.focusViolationCount === 1
                                  ? 'event'
                                  : 'events'}
                              </span>
                            </div>
                            <small title={formatDate(row.startedAt)}>
                              Started {formatStarted(row.startedAt)}
                            </small>
                          </div>
                          <div className="report-group-cell report-group-actions">
                            <span className="report-group-label">
                              Status &amp; actions
                            </span>
                            <span
                              className={`report-group-status rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(row.classification)}`}
                            >
                              {statusLabel(row.classification)}
                            </span>
                            <div className="report-group-buttons">
                              <button
                                type="button"
                                className="report-group-view"
                                onClick={() => setSelectedAttempt(row)}
                              >
                                View attempt
                              </button>
                              {row.classification !== 'void' &&
                                !row.isPreview && (
                                  <details className="report-attempt-menu">
                                    <summary
                                      aria-label={`More actions for ${row.respondentName}`}
                                    >
                                      ⋯
                                    </summary>
                                    <div>
                                      <button
                                        type="button"
                                        onClick={(event) => {
                                          event.currentTarget
                                            .closest('details')
                                            ?.removeAttribute('open');
                                          openRecovery(row, 'void');
                                        }}
                                      >
                                        Void &amp; allow retake
                                      </button>
                                    </div>
                                  </details>
                                )}
                            </div>
                            {row.eligibleForContinue && (
                              <button
                                type="button"
                                className="report-group-continue"
                                onClick={() => openRecovery(row, 'continue')}
                              >
                                Continue link (+5 min)
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                  </div>
                  <div
                    className="admin-report-table overflow-x-auto"
                    role="region"
                    aria-label="Attempt table, scroll for additional columns"
                    tabIndex={0}
                  >
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-5 py-3">
                            {sortHeader('Respondent', 'respondentName')}
                          </th>
                          <th className="px-5 py-3">
                            {sortHeader('Status', 'classification')}
                          </th>
                          <th className="px-5 py-3">
                            {sortHeader('Started', 'startedAt')}
                          </th>
                          <th className="px-5 py-3">
                            {sortHeader('Ended', 'endedAt')}
                          </th>
                          <th className="px-5 py-3">
                            {sortHeader('Last seen', 'lastActiveAt')}
                          </th>
                          <th className="px-5 py-3">
                            {sortHeader('Duration', 'timeInExamSeconds')}
                          </th>
                          <th className="px-5 py-3">
                            {sortHeader('Score', 'percentage')}
                          </th>
                          <th className="px-5 py-3">
                            {sortHeader('Focus events', 'focusViolationCount')}
                          </th>
                          <th className="px-5 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filtered
                          .filter((row) => row.isPreview === previewTable)
                          .map((row) => (
                            <tr
                              key={row.id}
                              className={
                                row.isPreview
                                  ? 'bg-violet-50/40'
                                  : row.classification === 'void'
                                    ? 'bg-slate-50 opacity-75'
                                    : ''
                              }
                            >
                              <td className="px-5 py-4">
                                <button
                                  type="button"
                                  onClick={() => setSelectedAttempt(row)}
                                  className="text-left"
                                >
                                  <span className="block font-medium text-slate-900">
                                    {row.respondentName}
                                  </span>
                                  <span className="mt-1 block text-xs text-slate-500">
                                    {row.respondentIdentifier ||
                                      row.respondentEmail ||
                                      `Attempt #${row.attemptNumber}`}
                                  </span>
                                  {row.isPreview && (
                                    <span className="mt-1 block text-[10px] font-semibold uppercase text-violet-700">
                                      {row.previewedByRole === 'PreviewCoded'
                                        ? 'Preview Coded'
                                        : 'Admin Attempt'}
                                    </span>
                                  )}
                                </button>
                              </td>
                              <td className="px-5 py-4">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(row.classification)}`}
                                >
                                  {statusLabel(row.classification)}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <AttemptDateTime
                                  value={row.startedAt}
                                  emptyLabel="Not recorded"
                                />
                              </td>
                              <td className="px-5 py-4">
                                <AttemptDateTime
                                  value={row.endedAt}
                                  emptyLabel={
                                    row.active ? 'Still answering' : 'Not ended'
                                  }
                                />
                              </td>
                              <td className="px-5 py-4">
                                <AttemptDateTime
                                  value={row.lastActiveAt}
                                  emptyLabel="Unknown"
                                />
                              </td>
                              <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                                {formatDuration(row.timeInExamSeconds)}
                              </td>
                              <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-900">
                                {row.scoreIsProvisional
                                  ? Object.values(row.answers).some(
                                      (answer) => answer.length,
                                    )
                                    ? `Provisional: ${row.earnedPoints}/${row.possiblePoints} points`
                                    : '—'
                                  : row.percentage === null
                                    ? 'Pending grade'
                                    : `${row.earnedPoints}/${row.possiblePoints} points · ${row.percentage}%`}
                              </td>
                              <td className="px-5 py-4 text-slate-600">
                                {row.focusViolationCount === 1
                                  ? '1 violation'
                                  : `${row.focusViolationCount} violations`}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex min-w-32 flex-col items-start gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedAttempt(row)}
                                    className="font-medium text-blue-700"
                                  >
                                    View attempt
                                  </button>
                                  {row.eligibleForContinue && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openRecovery(row, 'continue')
                                      }
                                      className="font-medium text-blue-700"
                                    >
                                      Copy continue link
                                    </button>
                                  )}
                                  {row.classification !== 'void' &&
                                    !row.isPreview && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openRecovery(row, 'void')
                                        }
                                        className="font-medium text-slate-500"
                                      >
                                        Void &amp; allow retake
                                      </button>
                                    )}
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              ))}
            </div>
          )}

          {tab === 'matrix' && (
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
                <div>
                  <h2 className="font-semibold text-slate-950">
                    Answer matrix
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    ✓ Correct · ✕ Incorrect · — Skipped · ○ Ungraded.
                    Presentation mode hides matrix names only, not exports or
                    other views.
                  </p>
                </div>
                <div className="flex gap-2">
                  <select
                    value={matrixResult}
                    onChange={(event) =>
                      setMatrixResult(event.target.value as typeof matrixResult)
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="all">All answers</option>
                    <option value="correct">Correct</option>
                    <option value="incorrect">Incorrect</option>
                    <option value="skipped">Skipped</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setAnonymized((value) => !value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {anonymized ? 'Show names' : 'Presentation mode'}
                  </button>
                </div>
              </div>
              <div className="max-h-[70vh] overflow-auto">
                <table className="min-w-max text-left text-xs">
                  <thead className="sticky top-0 z-[1] bg-slate-950 text-white">
                    <tr>
                      <th className="sticky left-0 z-[2] min-w-52 bg-slate-950 px-4 py-3">
                        Respondent
                      </th>
                      {report.exam.questions.map((question, index) => (
                        <th
                          key={question.id}
                          className="min-w-48 max-w-72 px-4 py-3"
                        >
                          <span className="block text-blue-300">
                            Q{index + 1}
                          </span>
                          <span className="mt-1 block line-clamp-2 font-normal text-slate-300">
                            {question.prompt}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered
                      .filter((row) => !row.isPreview)
                      .map((row, rowIndex) => (
                        <tr key={row.id}>
                          <td className="sticky left-0 bg-white px-4 py-3 font-medium text-slate-900 shadow-[1px_0_0_#e2e8f0]">
                            {anonymized
                              ? `Respondent ${rowIndex + 1}`
                              : row.respondentName}
                          </td>
                          {report.exam.questions.map((question) => {
                            const answers = row.answers[question.id] ?? [];
                            const correct = answerCorrect(question, answers);
                            const result =
                              answers.length === 0
                                ? 'skipped'
                                : correct === true
                                  ? 'correct'
                                  : correct === false
                                    ? 'incorrect'
                                    : 'ungraded';
                            const hidden =
                              matrixResult !== 'all' && matrixResult !== result;
                            return (
                              <td
                                key={question.id}
                                title={answerText(question, answers)}
                                className={`max-w-72 whitespace-normal px-4 py-3 leading-5 ${hidden ? 'opacity-15' : correct === true ? 'bg-emerald-50 text-emerald-800' : correct === false ? 'bg-red-50 text-red-800' : answers.length === 0 ? 'bg-slate-50 text-slate-400' : 'text-slate-700'}`}
                              >
                                <button
                                  type="button"
                                  onClick={() => setSelectedAttempt(row)}
                                  className="line-clamp-3 text-left"
                                >
                                  {result === 'correct'
                                    ? '✓ '
                                    : result === 'incorrect'
                                      ? '✕ '
                                      : result === 'ungraded'
                                        ? '○ '
                                        : ''}
                                  {answerText(question, answers)}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === 'questions' && (
            <section className="space-y-4">
              {report.questionPerformance.map((item, index) => {
                const question = questionById.get(item.questionId);
                return (
                  <article
                    key={item.questionId}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                          Question {index + 1}
                        </p>
                        <h2 className="mt-2 font-medium leading-6 text-slate-950">
                          {item.prompt}
                        </h2>
                        <p className="mt-2 text-xs text-slate-500">
                          {item.graded && question?.correctAnswers.length
                            ? `${item.points} points · ${item.correctCount} correct · ${item.incorrectCount} incorrect · ${item.skippedCount} skipped`
                            : 'Not currently graded — historical answers are preserved.'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-semibold text-slate-950">
                          {item.correctPercentage === null
                            ? '—'
                            : `${item.correctPercentage}%`}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Avg.{' '}
                          {item.averageResponseSeconds === null
                            ? '—'
                            : formatDuration(item.averageResponseSeconds)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${item.correctPercentage ?? 0}%` }}
                      />
                    </div>
                    {item.optionPerformance.length > 0 && (
                      <div className="mt-5 space-y-2">
                        {item.optionPerformance.map((option) => (
                          <div key={option.optionId}>
                            <div className="flex justify-between gap-4 text-xs">
                              <span
                                className={
                                  option.correct
                                    ? 'font-semibold text-emerald-700'
                                    : 'text-slate-700'
                                }
                              >
                                {option.label}
                                {option.correct ? ' ✓' : ''}
                              </span>
                              <span className="text-slate-500">
                                {option.selectedCount} ·{' '}
                                {option.selectedPercentage}%
                              </span>
                            </div>
                            <div className="mt-1 h-2 overflow-hidden rounded bg-slate-100">
                              <div
                                className={`h-full ${option.correct ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                style={{
                                  width: `${option.selectedPercentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                      {item.incorrectRespondents.length > 0 && (
                        <p className="leading-5 text-red-700">
                          <span className="font-semibold">Incorrect:</span>{' '}
                          {item.incorrectRespondents
                            .map((person) => person.name)
                            .join(', ')}
                        </p>
                      )}
                      {item.correctRespondents.length > 0 && (
                        <p className="leading-5 text-emerald-700">
                          <span className="font-semibold">Correct:</span>{' '}
                          {item.correctRespondents
                            .map((person) => person.name)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          )}
          {recovery && (
            <AdminDialog
              title={`${recovery.kind === 'continue' ? 'Continue attempt' : 'Void & allow retake'} · ${recovery.row.respondentName}`}
              onClose={() => {
                if (!recoveryBusy) setRecovery(null);
              }}
            >
              <p>
                Attempt #{recovery.row.attemptNumber} ·{' '}
                {statusLabel(recovery.row.classification)}
              </p>
              <p className="admin-notice admin-warning">
                {recovery.kind === 'continue'
                  ? 'Adds five minutes. Generating this link invalidates the previous continuation link. Answers and attempt history are retained.'
                  : 'The record and reason remain in audit history. This releases the attempt allowance so the respondent can retake, subject to availability.'}
              </p>
              {recovery.kind === 'void' && (
                <label className="block my-4">
                  Reason
                  <textarea
                    rows={3}
                    className="mt-2 w-full rounded-lg border p-3"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
              )}
              {continueLink && (
                <label className="block my-4">
                  Generated continuation link
                  <input
                    readOnly
                    value={continueLink}
                    onFocus={(e) => e.target.select()}
                    className="mt-2 w-full rounded-lg border p-3"
                  />
                  <button
                    type="button"
                    onClick={() => void copyContinue(continueLink)}
                    className="mt-2 rounded-lg border px-4 py-3"
                  >
                    Copy link again
                  </button>
                </label>
              )}
              {recoveryMessage && (
                <p role="status" className="my-4">
                  {recoveryMessage}
                </p>
              )}
              <button
                type="button"
                disabled={
                  recoveryBusy ||
                  recoveryDone ||
                  !!continueLink ||
                  (recovery.kind === 'void' &&
                    (!reason.trim() ||
                      recoveryMessage.startsWith('Attempt voided')))
                }
                onClick={() => void performRecovery()}
                className="rounded-lg bg-blue-600 px-4 py-3 text-white disabled:opacity-50"
              >
                {recoveryBusy
                  ? 'Working…'
                  : recovery.kind === 'continue'
                    ? 'Generate & copy continue link'
                    : 'Confirm void & allow retake'}
              </button>
            </AdminDialog>
          )}
          {selectedAttempt && (
            <AttemptDetail
              respondent={selectedAttempt}
              questions={report.exam.questions}
              onClose={() => setSelectedAttempt(null)}
            />
          )}
        </div>
      </div>
    </AdminWorkspace>
  );
}
