'use client';
import Link from 'next/link';
import { BatchTools } from '@/components/book/BatchTools';
import { panels, type Panel } from '@/components/book/domain';
import type { NotesModel } from './useNotesWorkspace';
import { defaultWidths, presetNames } from './workspaceLayout';
import { NotesIcon } from './NotesIcon';

const labels: Record<Panel, string> = { inbox: 'Inbox', organizer: 'Folders', calendar: 'Lenses', context: 'Note' };

export function NotesToolbar({ notes }: { notes: NotesModel }) {
  const { model, theme, workspace } = notes;
  const onTheme = () => notes.setTheme(value => value === 'light' ? 'dark' : 'light');
  function toggle(panel: Panel) {
    if (panel === 'context' && model.dirty) { model.actions.setError('Save or discard your note draft first.'); return; }
    model.setExpandedPanel(null);
    model.setVisible(previous => previous.includes(panel) ? previous.filter(value => value !== panel) : panels.filter(value => previous.includes(value) || value === panel));
  }
  return <header className="an-toolbar">
    <h1>Notes</h1><span className="an-local-hint">Your working space</span>
    <div className="an-toolbar-controls">
      <details className="ab-popover an-layout-settings"><summary>Layout · {presetNames[workspace.preset]}</summary><div>
        <label>Workspace<select aria-label="Workspace layout" value={workspace.preset} onChange={event => { const value = event.target.value; if (value === 'panels' || value === 'browse' || value === 'create') notes.setPreset(value); }}>
          {Object.entries(presetNames).map(([value, name]) => <option value={value} key={value}>{name}</option>)}
        </select></label>
        <label>Pane sizing<select aria-label="Pane sizing" value={workspace.sizing} onChange={event => notes.setWorkspace(previous => ({ ...previous, sizing: event.target.value === 'auto' ? 'auto' : 'stable' }))}><option value="stable">Keep my widths</option><option value="auto">Auto fit</option></select></label>
        <small>{workspace.sizing === 'stable' ? 'Keep navigation steady. Spare space goes to your work.' : 'Share available space across visible panes. Resizing rebalances them together.'}</small>
        <button onClick={() => notes.setWorkspace(previous => ({ ...previous, widths: { ...previous.widths, [previous.preset]: { ...defaultWidths[previous.preset] } } }))}>Reset widths</button>
      </div></details>
      <button className="an-new-note" onClick={() => model.add(undefined, notes.panes.folders.find(pane => pane.id === notes.panes.activeFolder)?.folderId)}>+ New note</button>
      <label className="an-search"><NotesIcon name="search" /><input aria-label="Search notes" placeholder="Search your notes…" value={model.query} onChange={event => model.setQuery(event.target.value)} /></label>
      <details className="ab-popover" hidden={workspace.preset !== 'panels'}><summary>Panels</summary><div>{panels.map((panel) => <label key={panel}><input type="checkbox" checked={model.visible.includes(panel)} onChange={() => toggle(panel)} />{labels[panel]}</label>)}<button onClick={() => { model.setExpandedPanel(null); model.setVisible([...panels]); }}>Show all panels</button></div></details>
      <button className="an-icon-button" aria-label={`Use ${theme === 'light' ? 'Charcoal' : 'Light'} appearance`} title={`Use ${theme === 'light' ? 'Charcoal' : 'Light'} appearance`} onClick={onTheme}><NotesIcon name={theme === 'light' ? 'sun' : 'moon'} /></button>
      <details className="ab-popover an-more"><summary aria-label="More Notes tools" title="More Notes tools"><NotesIcon name="more" />{model.batchMode && <span className="an-batch-indicator" />}</summary><div>
        <Link href={`/orgs/${model.orgId}/airunote/library`}>Open library ↗</Link>
        <label><input type="checkbox" checked={model.batchMode} onChange={event => model.setBatchMode(event.target.checked)} />Batch actions{model.batchIds.length ? ` · ${model.batchIds.length} selected` : ''}</label>
        {model.batchMode && <BatchTools model={model} />}
      </div></details>
    </div>
  </header>;
}
