'use client';
import { useCallback, useEffect, useState } from 'react';
import { examsApi } from '@/lib/api/exams';
import { apiError } from '@/lib/api/appearance';
import { AdminDialog } from './AdminDialog';
export function PreviewCodeControl({
  orgId,
  examId,
  access = false,
}: {
  orgId: string;
  examId: string;
  access?: boolean;
}) {
  const [enabled, setEnabled] = useState<boolean>();
  const [statusError, setStatusError] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ code: string | null; path: string }>();
  const [message, setMessage] = useState('');
  const load = useCallback(
    () =>
      examsApi
        .accessCodeStatus(orgId, examId)
        .then((v) => {
          setEnabled(v.enabled);
          setStatusError(false);
        })
        .catch(() => setStatusError(true)),
    [orgId, examId],
  );
  useEffect(() => {
    setEnabled(undefined);
    setResult(undefined);
    setMessage('');
    if (access) void load();
  }, [orgId, examId, access, load]);
  async function configure(next: boolean) {
    setBusy(true);
    setMessage('');
    try {
      setResult(
        await (access ? examsApi.accessCode : examsApi.previewCode)(
          orgId,
          examId,
          next,
        ),
      );
      setEnabled(next);
      setStatusError(false);
      setMessage(
        next
          ? 'Code generated. Copy it before closing.'
          : 'Code access disabled.',
      );
    } catch (e) {
      setMessage(apiError(e));
    } finally {
      setBusy(false);
    }
  }
  const title = access ? 'Examiner code' : 'Public reviewer preview code';
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-violet-300 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800"
      >
        {title}
        {access
          ? ` · ${statusError ? 'Unknown' : enabled === undefined ? 'Loading…' : enabled ? 'On' : 'Off'}`
          : ''}
      </button>
      {open && (
        <AdminDialog
          title={title}
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <div className="space-y-4">
            <p className="text-sm">
              {access
                ? 'Require an eight-digit code after opening the gift. Normal grading, timers, schedules, and attempt limits still apply. Existing attempts keep their tokens when you rotate the code.'
                : 'Share this link and code with reviewers. Tests are graded with unlimited attempts and appear separately in Preview attempts, not participant exports.'}
            </p>
            <div className="admin-notice admin-warning">
              Generating a new code replaces the old code. Only its hash is
              stored; you cannot retrieve this code later.
            </div>
            {statusError && (
              <p role="alert">
                Could not load examiner-code status.{' '}
                <button type="button" onClick={() => void load()}>
                  Retry status
                </button>
              </p>
            )}
            {result?.code && (
              <div>
                <p className="rounded-xl bg-violet-50 p-4 text-center font-mono text-3xl tracking-widest text-violet-900">
                  {result.code}
                </p>
                <label className="block mt-3 text-sm">
                  Reviewer / access link
                  <input
                    readOnly
                    onFocus={(e) => e.target.select()}
                    className="mt-2 w-full rounded-lg border p-3"
                    value={`${window.location.origin}${result.path}`}
                  />
                </label>
                <button
                  type="button"
                  className="mt-3 rounded-lg border px-4 py-3"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        `${window.location.origin}${result.path}\nCode: ${result.code}`,
                      );
                      setMessage('Link and code copied.');
                    } catch {
                      setMessage(
                        'Clipboard unavailable. Select the link and copy the displayed code manually.',
                      );
                    }
                  }}
                >
                  Copy link & code
                </button>
              </div>
            )}
            {message && (
              <p role="status" className="text-sm">
                {message}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void configure(true)}
                className="rounded-lg bg-violet-800 px-4 py-3 text-white disabled:opacity-50"
              >
                {busy ? 'Working…' : enabled ? 'Rotate code' : 'Generate code'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void configure(false)}
                className="rounded-lg border px-4 py-3 disabled:opacity-50"
              >
                Disable code
              </button>
            </div>
          </div>
        </AdminDialog>
      )}
    </>
  );
}
