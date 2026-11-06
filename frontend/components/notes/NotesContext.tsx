'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { EditorSessionContext } from '@/components/book/EditorSession';
import type { NotesModel } from './useNotesWorkspace';
import type { EditorTab } from './editorTabs';
import { NotesContent } from './NotesContent';
import { NotesFolderDetails } from './NotesFolderDetails';
import { PaneMenu } from './PaneMenu';

function title(notes: NotesModel, tab: EditorTab) {
  return notes.model.items.find(item => item.id === tab.noteId)?.name || tab.name.trim() || 'Untitled note';
}
function CloseEditorDialog({ notes }: { notes: NotesModel }) {
  const { editors } = notes; const dialog = useRef<HTMLDialogElement>(null); const id = useId();
  useEffect(() => { if (editors.closing) dialog.current?.showModal(); else dialog.current?.close(); }, [editors.closing]);
  const tab = editors.state.tabs.find(tab => tab.key === editors.closing);
  const busy = editors.saving || notes.model.actions.busy;
  return <dialog ref={dialog} className="an-lifecycle-dialog" aria-labelledby={id} onCancel={event => { event.preventDefault(); if (!busy) editors.cancelClose(); }}>
    <h2 id={id}>Save before closing?</h2><p>{tab ? title(notes, tab) : 'This note'} has unsaved changes.</p>
    {notes.model.actions.error && <p role="alert" className="ab-error">{notes.model.actions.error}</p>}
    <div className="an-dialog-actions"><button disabled={busy} onClick={editors.cancelClose}>Cancel</button><button disabled={busy} onClick={() => void editors.confirmClose(false)}>Discard</button><button className="ab-primary" disabled={busy} onClick={() => void editors.confirmClose(true)}>{editors.saving ? 'Saving…' : 'Save and close'}</button></div>
  </dialog>;
}
export function NotesContext({ notes }: { notes: NotesModel }) {
  const id = useId(); const { editors } = notes; const { state } = editors;
  const tablist = useRef<HTMLDivElement>(null);
  const folder = notes.model.folders.find(value => value.id === notes.folderContextId);
  const showingFolder = !!folder && (notes.contextTab === 'folder' || !state.tabs.length);
  useEffect(() => {
    const list = tablist.current;
    if (!list) return;
    const reveal = () => {
      const active = list.querySelector<HTMLElement>('[aria-selected=true]')?.parentElement;
      if (!active) return;
      const bounds = list.getBoundingClientRect(), tab = active.getBoundingClientRect();
      if (tab.left < bounds.left) list.scrollLeft += tab.left - bounds.left;
      else if (tab.right > bounds.right) list.scrollLeft += tab.right - bounds.right;
    };
    reveal();
    const observer = new ResizeObserver(reveal); observer.observe(list);
    return () => observer.disconnect();
  }, [state.active, state.tabs, showingFolder]);
  useEffect(() => { if (notes.folderContextId && !folder && !notes.folderDirty) notes.closeFolderDetails(); });
  const visible = state.layout === 'single' ? state.active ? [state.active] : [] : state.visible;
  const [visited, setVisited] = useState<string[]>([]);
  const visibleKey = visible.join(',');
  useEffect(() => {
    setVisited(previous => {
      const next = state.tabs.filter(tab => previous.includes(tab.key) || visible.includes(tab.key)).map(tab => tab.key);
      return next.join(',') === previous.join(',') ? previous : next;
    });
    // Mount restored editors only when first shown, then retain their drafts and scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.tabs, visibleKey]);
  function activate(key: string) { editors.focus(key); notes.setContextTab('note'); }
  return <section className="an-context-workspace" aria-label="Notes and Properties">
    <header className="an-context-tabs an-editor-tabs">
      <div ref={tablist} role="tablist" aria-label="Open notes" onKeyDown={event => {
        const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]'));
        const index = tabs.findIndex(tab => tab === event.target);
        if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        tabs[next]?.focus(); tabs[next]?.click();
      }}>
        {state.tabs.map(tab => <span key={tab.key} data-visible={!showingFolder && visible.includes(tab.key)}>
          <button role="tab" id={`${id}-${tab.key}`} aria-controls={`${id}-${tab.key}-panel`} aria-selected={!showingFolder && state.active === tab.key} tabIndex={!showingFolder && state.active === tab.key ? 0 : -1} title={title(notes, tab)} onClick={() => activate(tab.key)}>{title(notes, tab)}{!tab.noteId && <small> Draft</small>}{tab.dirty && <span aria-label="Unsaved changes"> •</span>}</button>
          <button aria-label={`Close ${title(notes, tab)} tab`} disabled={notes.model.actions.busy} onClick={() => { notes.model.actions.setError(null); activate(tab.key); editors.requestClose(tab.key); }}>×</button>
        </span>)}
        {folder && <span><button role="tab" id={id + '-folder'} aria-controls={id + '-folder-panel'} aria-selected={showingFolder} tabIndex={showingFolder ? 0 : -1} onClick={() => notes.setContextTab('folder')}>Properties</button><button aria-label="Close Properties tab" onClick={notes.closeFolderDetails}>×</button></span>}
      </div>
      <div className="an-context-tools">
        {state.tabs.length > 1 && <PaneMenu label="All open notes">{state.tabs.map(tab => <button data-menu-action key={tab.key} aria-current={state.active === tab.key ? 'page' : undefined} onClick={() => activate(tab.key)}>{title(notes, tab)}{tab.dirty ? ' •' : ''}</button>)}</PaneMenu>}
        <button aria-label="New note tab" title="New note" onClick={() => notes.model.add()}>+</button>
        <select aria-label="Note layout" value={state.layout} onChange={event => { const value = event.target.value; if (value === 'single' || value === 'row' || value === 'grid') { editors.layout(value); notes.setContextTab('note'); } }}><option value="single">Single</option><option value="row">1 × 4</option><option value="grid">2 × 2</option></select>
        {state.layout !== 'single' && <details className="ab-popover an-editor-picker"><summary>Visible {state.visible.length}/4</summary><div>{state.tabs.map(tab => <label key={tab.key}><input type="checkbox" checked={state.visible.includes(tab.key)} disabled={state.visible.includes(tab.key) ? state.visible.length === 1 : state.visible.length === 4} onChange={() => editors.toggle(tab.key)}/><span>{title(notes, tab)}</span></label>)}</div></details>}
        {notes.workspace.preset === 'cards' && <button aria-pressed={notes.model.visible.includes('calendar')} onClick={() => notes.togglePanel('calendar')}>{notes.model.visible.includes('calendar') ? 'Hide view' : 'Show view'}</button>}
        <button aria-label="Hide notes panel" onClick={() => notes.togglePanel('context')}>Hide</button>
        <button aria-pressed={notes.pinned} onClick={() => notes.setPinned(value => !value)}>{notes.pinned ? 'Unpin' : 'Pin'}</button>
        <button aria-label="Expand context panel" onClick={() => notes.model.setExpandedPanel(value => value === 'context' ? null : 'context')}>{notes.model.expandedPanel === 'context' ? '↙' : '↗'}</button>
      </div>
    </header>
    <div className="an-editor-viewport" hidden={showingFolder || !state.tabs.length}>
      <div className="an-editor-grid" data-layout={state.layout} data-count={visible.length}>
        {state.tabs.filter(tab => visible.includes(tab.key) || visited.includes(tab.key)).map(tab => {
          const scoped = notes.scopedModel(notes.model.items.find(item => item.id === tab.noteId)?.folderId ?? tab.folderId);
          const model = editors.modelFor(tab, { ...scoped, shownPanels: notes.model.shownPanels });
          return <div key={tab.key} className="an-editor-cell" data-active={state.active === tab.key} data-scroll-scope={`editor:${tab.key}`} role="tabpanel" id={`${id}-${tab.key}-panel`} aria-labelledby={`${id}-${tab.key}`} hidden={!visible.includes(tab.key)} onFocusCapture={() => { if (state.active !== tab.key) editors.focus(tab.key); }} onPointerDown={() => { if (state.active !== tab.key) editors.focus(tab.key); }}>
            {state.layout !== 'single' && <header className="an-editor-cell-heading"><button onClick={() => activate(tab.key)}>{title(notes, tab)}</button><button aria-label={`Show only ${title(notes, tab)}`} title="Show only this note" onClick={() => { activate(tab.key); editors.layout('single'); }}>↗</button></header>}
            <div className="an-context-body"><EditorSessionContext.Provider value={editors.forTab(tab.key).session}><NotesContent model={model} pinned={notes.pinned} onPin={() => notes.setPinned(value => !value)} onClose={() => editors.requestClose(tab.key)}/></EditorSessionContext.Provider></div>
          </div>;
        })}
      </div>
    </div>
    {!state.tabs.length && !folder && <div className="an-view-empty"><h2>Choose a note</h2><p>Open notes here, then choose a layout to work side by side.</p><button onClick={() => notes.model.add()}>Create a note</button></div>}
    <div className="an-context-body" role="tabpanel" id={id + '-folder-panel'} aria-labelledby={id + '-folder'} hidden={!showingFolder}>{folder && <NotesFolderDetails key={folder.id} notes={notes} folder={folder}/>}</div>
    <CloseEditorDialog notes={notes}/>
  </section>;
}
