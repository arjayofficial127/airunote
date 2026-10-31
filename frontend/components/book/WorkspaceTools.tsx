'use client';
import { useState } from 'react';
import type { BookWorkspaceModel } from './useBookWorkspace';
import { folderLabel, panels, type Panel } from './domain';
import { BatchTools } from './BatchTools';

export function WorkspaceTools({ model }: { model: BookWorkspaceModel }) {
  const [viewName, setViewName] = useState('');
  const hasScope = model.selectedFolders.length !== model.folders.length;
  function toggle(panel: Panel) {
    if (model.expandedPanel === panel) model.setExpandedPanel(null);
    model.setVisible(previous => previous.includes(panel) ? previous.filter(value => value !== panel) : panels.filter(value => value === panel || previous.includes(value)));
  }
  function showAll() { model.setExpandedPanel(null); model.setVisible([...panels]); }
  return <div className="ab-workspace-tools">
    <div className="ab-panel-toggles" aria-label="Visible Book panels">
      {panels.map((panel, index) => <label key={panel}><input type="checkbox" checked={model.visible.includes(panel)} onChange={() => toggle(panel)} /><small>0{index + 1}</small>{panel[0]?.toUpperCase()}{panel.slice(1)}</label>)}
      <button className="ab-link" onClick={showAll}>{model.expandedPanel ? 'Restore layout' : 'Show all'}</button>
    </div>
    <div className="ab-scope-tools">
      <details className="ab-popover"><summary>{hasScope ? `${model.selectedFolders.length} folders` : 'All projects'}</summary><div>
        <div className="ab-form-pair"><button onClick={() => model.setFolderFilter(null)}>Select all</button><button onClick={() => model.setFolderFilter([])}>Unselect all</button></div>
        {model.folders.map(folder => <label key={folder.id}><input type="checkbox" checked={model.selectedFolders.includes(folder.id)} onChange={event => model.setFolderFilter(event.target.checked ? [...model.selectedFolders, folder.id] : model.selectedFolders.filter(id => id !== folder.id))} />{folderLabel(folder.humanId)}{folder.id === model.rootFolderId ? ' (Inbox / no subfolder)' : ''}</label>)}
      </div></details>
      <details className="ab-popover"><summary>Views</summary><div>
        {model.config.views.length === 0 && <small>No saved views yet.</small>}
        {model.config.views.map(view => <div className="ab-form-pair" key={view.id}><button onClick={() => model.applyView(view)}>{view.name}</button><button aria-label={`Remove view ${view.name}`} disabled={model.actions.busy} onClick={() => void model.actions.configure({ ...model.config, views: model.config.views.filter(candidate => candidate.id !== view.id) })}>×</button></div>)}
        <label>Save current view<input value={viewName} maxLength={100} onChange={event => setViewName(event.target.value)} placeholder="View name" /></label>
        <button disabled={!viewName.trim() || model.actions.busy} onClick={() => void model.actions.configure({ ...model.config, views: [...model.config.views, model.view(viewName.trim())] }).then(saved => { if (saved) setViewName(''); })}>Save view</button>
      </div></details>
      <details className="ab-popover" onToggle={event => model.setBatchMode(event.currentTarget.open)}><summary>Batch{model.batchIds.length ? ` · ${model.batchIds.length}` : ''}</summary><div><BatchTools model={model} /></div></details>
      <div className="ab-search-wrap"><input className="ab-search" aria-label="Search Book items" placeholder="Search all panels…" value={model.query} onChange={event => model.setQuery(event.target.value)} />{model.query && <button aria-label="Clear Book search" onClick={() => model.setQuery('')}>×</button>}</div>
    </div>
    {(model.query.trim() || hasScope) && <div className="ab-search-status" role="status">{model.filtered.length} of {model.items.length} entries match across Inbox, Organizer, and Calendar. <button className="ab-link" onClick={() => { model.setQuery(''); model.setFolderFilter(null); }}>Reset search and scope</button></div>}
  </div>;
}
