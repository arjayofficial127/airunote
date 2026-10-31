'use client';
import Link from 'next/link';
import { BatchTools } from '@/components/book/BatchTools';
import { panels, type Panel } from '@/components/book/domain';
import type { BookWorkspaceModel } from '@/components/book/useBookWorkspace';
import { NotesIcon } from './NotesIcon';

const labels: Record<Panel, string> = { inbox: 'Inbox', organizer: 'Folders', calendar: 'Plan', context: 'Note' };

export function NotesToolbar({ model, theme, onTheme }: { model: BookWorkspaceModel; theme: 'light' | 'dark'; onTheme: () => void }) {
  function toggle(panel: Panel) {
    if (panel === 'context' && model.dirty) { model.actions.setError('Save or discard your note draft first.'); return; }
    model.setExpandedPanel(null);
    model.setVisible(previous => previous.includes(panel) ? previous.filter(value => value !== panel) : panels.filter(value => previous.includes(value) || value === panel));
  }
  return <header className="an-toolbar">
    <h1>Notes</h1><span className="an-local-hint">Your working space</span>
    <div className="an-toolbar-controls">
      <label className="an-search"><NotesIcon name="search" /><input aria-label="Search notes" placeholder="Search your notes…" value={model.query} onChange={event => model.setQuery(event.target.value)} /></label>
      <details className="ab-popover"><summary>Panels</summary><div>{panels.map((panel) => <label key={panel}><input type="checkbox" checked={model.visible.includes(panel)} onChange={() => toggle(panel)} />{labels[panel]}</label>)}<button onClick={() => { model.setExpandedPanel(null); model.setVisible([...panels]); }}>Show all panels</button></div></details>
      <button className="an-icon-button" aria-label={`Use ${theme === 'light' ? 'Charcoal' : 'Light'} appearance`} title={`Use ${theme === 'light' ? 'Charcoal' : 'Light'} appearance`} onClick={onTheme}><NotesIcon name={theme === 'light' ? 'sun' : 'moon'} /></button>
      <details className="ab-popover an-more"><summary aria-label="More Notes tools" title="More Notes tools"><NotesIcon name="more" />{model.batchMode && <span className="an-batch-indicator" />}</summary><div>
        <Link href={`/orgs/${model.orgId}/airunote/library`}>Open library ↗</Link>
        <label><input type="checkbox" checked={model.batchMode} onChange={event => model.setBatchMode(event.target.checked)} />Batch actions{model.batchIds.length ? ` · ${model.batchIds.length} selected` : ''}</label>
        {model.batchMode && <BatchTools model={model} />}
      </div></details>
    </div>
  </header>;
}
