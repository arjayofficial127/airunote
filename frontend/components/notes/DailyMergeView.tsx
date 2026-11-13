'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { BookItem } from '@/components/book/domain';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';
import type { AiruDocument } from '@/components/airunote/types';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { errorMessage } from '@/components/book/services';
import { useBookContent } from '@/providers/hydratedContent/BookContentProvider';
import { record } from '@/lib/book';
import { lifecycleApi } from './services/lifecycle';
import { buildDailyMerge, compareDailyVersions, comparisonLine, dailyComparisonBlocks, type Choice, type Difference } from './dailyComparison';
import { dailySnapshotSchema } from './dailyDraft';
import { savedSnapshot } from './dailySnapshot';
import type { DailySnapshot } from './mergeDailyNote';

const merged = (item: BookItem) => !!record(item.attributes.airunoteDailyConflict).mergedAt;
const revision = (item: { updatedAt: Date }) => new Date(item.updatedAt).toISOString();

function Lines<T>({ values, line }: { values: T[]; line: (value: T) => string }) {
  return values.length ? <div className="an-version-lines">
    {values.map((value, index) => <div key={index}>{line(value) || '\u00a0'}</div>)}
  </div> : <span className="an-version-empty">No text here</span>;
}

function CompareSection<T>({ title, id, groups, line, choices, onChoice }: {
  title: string; id: string; groups: Difference<T>[]; line: (value: T) => string;
  choices: Record<string, Choice>; onChoice: (key: string, choice: Choice) => void;
}) {
  return <section className="an-version-section" aria-label={title}>
    <h3>{title}</h3>
    {groups.map((group, index) => {
      const key = `${id}-${index}`;
      if (group.shared) return <details className="an-version-matching" key={key}>
        <summary>{group.original.length} matching {group.original.length === 1 ? 'line' : 'lines'}</summary>
        <Lines values={group.original} line={line}/>
      </details>;
      const options: Array<[Choice, string]> = [['original', 'Use original'], ['copy', 'Use copy'], ['both', 'Keep both']];
      return <div className="an-version-difference" key={key}>
        <div className="an-version-sides">
          <div><h4>Original</h4><Lines values={group.original} line={line}/></div>
          <div><h4>Draft copy</h4><Lines values={group.copy} line={line}/></div>
        </div>
        <div role="group" aria-label={`${title} difference ${index + 1}`} className="an-version-options">
          {options.map(([value, label]) => <button key={value} type="button" aria-pressed={(choices[key] ?? 'both') === value}
            onClick={() => onChoice(key, value)}>{label}</button>)}
        </div>
      </div>;
    })}
  </section>;
}

export function DailyMergeView({ model, originalId, heading, copies, onClose, onMerged }: {
  model: BookWorkspaceModel; originalId: string; heading: string; copies: BookItem[];
  onClose: () => void; onMerged: (snapshot: DailySnapshot, revision: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [copyId, setCopyId] = useState(() => copies.find(item => !merged(item))?.id ?? copies[0]?.id ?? '');
  const [versions, setVersions] = useState<{ original: AiruDocument; copy: AiruDocument } | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmTrash, setConfirmTrash] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const { load } = useBookContent();
  const copyItem = copies.find(item => item.id === copyId);
  const selectedId = copyItem?.id;
  const isMerged = !!copyItem && merged(copyItem);

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  useEffect(() => {
    if (!selectedId || isMerged) return;
    let active = true;
    setVersions(null);
    setChoices({});
    setLoading(true);
    setError('');
    void Promise.all([load(originalId, true), load(selectedId, true)]).then(([original, copy]) => {
      if (!active) return;
      if (original && copy && savedSnapshot(original) && savedSnapshot(copy)) setVersions({ original, copy });
      else setError('Airunote could not load both versions. Try loading them again.');
      setLoading(false);
    });
    return () => { active = false; };
  }, [selectedId, isMerged, originalId, load, refresh]);

  const comparison = useMemo(() => {
    if (!versions || versions.copy.id !== selectedId) return;
    const original = savedSnapshot(versions.original);
    const copy = savedSnapshot(versions.copy);
    if (original && copy) return compareDailyVersions(original, copy);
  }, [versions, selectedId]);
  const preview = useMemo(() => comparison && buildDailyMerge(comparison, choices), [comparison, choices]);
  const valid = preview && dailySnapshotSchema.safeParse(preview).success;
  const previewRows = useMemo(() => preview ? dailyComparisonBlocks(preview) : [], [preview]);
  const blocked = working || model.actions.busy;
  function choose(key: string, choice: Choice) { setChoices(current => ({ ...current, [key]: choice })); }

  async function save() {
    if (!versions || !preview || !valid || blocked || isMerged) return;
    setWorking(true);
    setError('');
    try {
      const result = await model.actions.mergeDailyConflict(originalId, revision(versions.original), versions.copy.id, revision(versions.copy), preview);
      if (!result) { setError('The merge could not be saved. If either version changed, reload both and review the new differences.'); return; }
      const snapshot = savedSnapshot(result.document);
      if (snapshot) onMerged(snapshot, revision(result.document));
      setNotice('Merged version saved to the original.');
    } finally { setWorking(false); }
  }

  async function cleanup(state: 'archived' | 'trashed') {
    if (!copyItem || !isMerged || blocked) return;
    setWorking(true);
    setError('');
    try {
      const patch = await lifecycleApi.note(model.orgId, copyItem.id, state, revision(copyItem));
      const store = useAirunoteStore.getState();
      const current = store.getDocumentMetadataById(patch.id);
      if (current) store.updateDocumentMetadata({ ...current, ...patch });
      store.removeDocumentContent(patch.id);
      const remaining = copies.filter(item => item.id !== copyItem.id);
      setCopyId((remaining.find(item => !merged(item)) ?? remaining[0])?.id ?? '');
      setNotice(state === 'archived' ? 'Draft copy archived.' : 'Draft copy moved to Trash.');
      setConfirmTrash(false);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setWorking(false); }
  }

  return <dialog className="an-version-dialog" ref={dialog} aria-labelledby="an-version-title"
    onCancel={event => { event.preventDefault(); if (!blocked) onClose(); }}>
    <header>
      <div><h2 id="an-version-title">Review versions</h2><p>{heading}</p></div>
      <button type="button" onClick={onClose} disabled={blocked}>Close</button>
    </header>
    <div className="an-version-scroll">
      {copies.length > 0 && <label className="an-version-selector">
        Draft copy
        <select value={copyId} disabled={blocked} onChange={event => {
          setCopyId(event.target.value); setNotice(''); setError(''); setConfirmTrash(false);
        }}>
          {copies.map(item => <option key={item.id} value={item.id}>{item.name}{merged(item) ? ' · Merged' : ''}</option>)}
        </select>
      </label>}
      {notice && <p role="status">{notice}</p>}
      {error && <div className="an-version-error" role="alert">{error}
        {copyItem && !isMerged && <button type="button" disabled={blocked} onClick={() => setRefresh(value => value + 1)}>Reload both versions</button>}
      </div>}
      {isMerged ? <div className="an-version-cleanup">
        <p>This copy was merged into the original. You can keep it, archive it, or move it to recoverable Trash.</p>
        <button type="button" disabled={blocked} onClick={() => void cleanup('archived')}>Archive copy</button>
        {!confirmTrash ? <button type="button" disabled={blocked} onClick={() => setConfirmTrash(true)}>Move copy to Trash…</button>
          : <><button type="button" disabled={blocked} onClick={() => void cleanup('trashed')}>Confirm Move to Trash</button>
            <button type="button" disabled={blocked} onClick={() => setConfirmTrash(false)}>Cancel</button></>}
      </div> : loading ? <p role="status">Loading versions…</p> : comparison && <>
        <p>Matching lines appear once. Choose what to keep for each difference. Keep both puts the original text first.</p>
        <CompareSection title="Note" id="body" groups={comparison.body} line={comparisonLine} choices={choices} onChoice={choose}/>
        {!!comparison.reflection.length && <CompareSection title="Reflection" id="reflection" groups={comparison.reflection} line={line => line} choices={choices} onChoice={choose}/>}
        <section className="an-version-preview" aria-label="Merged preview">
          <h3>Merged preview</h3>
          <Lines values={previewRows} line={comparisonLine}/>
          {preview?.reflection && <><h4>Reflection</h4><Lines values={preview.reflection.split('\n')} line={line => line}/></>}
          {!valid && <p role="alert">The merge exceeds a note or checklist limit. Choose fewer sections before saving.</p>}
        </section>
      </>}
      {copies.length === 0 && <p>There are no remaining draft copies to review.</p>}
    </div>
    {!isMerged && comparison && <footer>
      <button type="button" className="an-version-save" disabled={blocked || !valid || loading} onClick={() => void save()}>
        {working ? 'Saving…' : 'Save merge to original'}
      </button>
    </footer>}
  </dialog>;
}
