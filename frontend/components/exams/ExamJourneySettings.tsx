'use client';

import { useEffect, useState } from 'react';
import { examsApi, type ExamOrgSettings } from '@/lib/api/exams';
import { useMetadataIndex } from '@/providers/MetadataIndexProvider';

interface ExamJourneySettingsProps {
  orgId: string;
}

export function ExamJourneySettings({ orgId }: ExamJourneySettingsProps) {
  const metadata = useMetadataIndex();
  const [settings, setSettings] = useState<ExamOrgSettings>({
    journeyMode: 'exam_first',
    visibleTopLevelApps: ['exams', 'airunote'],
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (metadata.index.examSettings) setSettings(metadata.index.examSettings);
  }, [metadata.index.examSettings]);

  const toggleApp = (app: 'exams' | 'airunote') => {
    setSettings((current) => {
      const isVisible = current.visibleTopLevelApps.includes(app);
      if (isVisible && current.visibleTopLevelApps.length === 1) return current;
      return {
        ...current,
        visibleTopLevelApps: isVisible
          ? current.visibleTopLevelApps.filter((item) => item !== app)
          : [...current.visibleTopLevelApps, app],
      };
    });
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await examsApi.updateSettings(orgId, settings);
      await metadata.refreshKey('examSettings');
      setMessage('Workspace journey updated.');
    } catch (error) {
      console.error('Failed to update exam journey', error);
      setMessage('Could not update the workspace journey.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg bg-white p-8 shadow">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Workspace journey</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Highlight exam creation for focused accounts while leaving secondary tools available.
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">Resident feature</span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {(['exam_first', 'standard'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setSettings((current) => ({ ...current, journeyMode: mode }))}
            className={`rounded-xl border p-4 text-left transition ${
              settings.journeyMode === mode ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="block text-sm font-semibold text-gray-900">{mode === 'exam_first' ? 'Exam-first' : 'Standard'}</span>
            <span className="mt-1 block text-xs text-gray-600">
              {mode === 'exam_first' ? 'Exams are emphasized as the primary destination.' : 'All visible tools receive equal menu weight.'}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-gray-800">Top-level menu</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {(['exams', 'airunote'] as const).map((app) => (
            <label key={app} className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={settings.visibleTopLevelApps.includes(app)}
                onChange={() => toggleApp(app)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              {app === 'exams' ? 'Exams' : 'Notes & folders'}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
          {saving ? 'Saving…' : 'Save journey'}
        </button>
        {message && <p className="text-sm text-gray-600">{message}</p>}
      </div>
    </section>
  );
}
