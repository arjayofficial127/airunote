'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BatchTools } from '@/components/book/BatchTools';
import { panels } from '@/components/book/domain';
import { RailPopover } from '@/components/layout/RailPopover';
import type { NotesModel } from './useNotesWorkspace';
import { defaultWidths, presetNames } from './workspaceLayout';
import { NotesIcon } from './NotesIcon';

const labels = { inbox: 'Inbox', organizer: 'Folders', navigation: 'Folders | Inbox', calendar: 'Folder view', context: 'Note / Details' };

/** Workspace controls live in the app rail; portals preserve the same editor/model. */
export function NotesToolbar({ notes }: { notes: NotesModel }) {
  const { model, workspace } = notes;
  const [targets, setTargets] = useState<{ actions: HTMLElement; settings: HTMLElement } | null>(null);
  useEffect(() => { const actions = document.getElementById('notes-rail-actions'), settings = document.getElementById('notes-rail-settings'); if (actions && settings) setTargets({ actions, settings }); }, []);
  const choices = workspace.preset === 'cards' ? ['navigation', 'calendar', 'context'] as const : panels;
  if (!targets) return null;
  return <>{createPortal(<div className="an-rail-direct">
    <RailPopover label="Search notes" trigger={<><NotesIcon name="search"/><span>Search</span>{model.query && <i className="an-rail-dot"/>}</>}>{close => <><label className="an-rail-search">Search notes<input aria-label="Search notes" placeholder="Search your notes…" value={model.query} onChange={event => model.setQuery(event.target.value)} /></label><small>Filters Inbox, folder notes and views.</small><button disabled={!model.query} onClick={() => model.setQuery('')}>Clear search</button><button onClick={close}>Done</button></>}</RailPopover>
    <button className="an-rail-trigger" aria-label="New note" title="New note" onClick={() => model.add(undefined, notes.panes.folders.find(pane => pane.id === notes.panes.activeFolder)?.folderId)}><span className="an-rail-plus" aria-hidden="true">+</span><span>New</span></button>
  </div>, targets.actions)}{createPortal(<RailPopover label="Workspace settings" trigger={<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m10 3-1 3-3 1-2-1-2 4 2 2v3l-1 2 3 3 3-1 3 1 2 2 4-2v-3l2-2 2-1-1-4-3-1-2-2V3Z"/><circle cx="12" cy="12" r="3"/></svg>}>{close => <>
    <strong>Workspace settings</strong>
    <label>Layout<select aria-label="Workspace layout" value={workspace.preset} onChange={event => notes.setPreset(event.target.value === 'cards' ? 'cards' : 'panels')}>{Object.entries(presetNames).map(([value, name]) => <option value={value} key={value}>{name}</option>)}</select></label>
    <fieldset><legend>Visible panels</legend>{choices.map(panel => <label className="an-rail-check" key={panel}><input type="checkbox" checked={panel === 'navigation' ? model.visible.some(value => value === 'inbox' || value === 'organizer') : model.visible.includes(panel)} onChange={() => notes.togglePanel(panel)} />{labels[panel]}</label>)}<button onClick={notes.showAllPanels}>Show all panels</button></fieldset>
    <label>Pane sizing<select aria-label="Pane sizing" value={workspace.sizing} onChange={event => notes.setWorkspace(previous => ({ ...previous, sizing: event.target.value === 'auto' ? 'auto' : 'stable' }))}><option value="stable">Keep my widths</option><option value="auto">Auto fit</option></select></label>
    <small>{workspace.sizing === 'stable' ? 'Lock saved widths. Extra space stays free; scroll when needed.' : 'Share available space. Resizing rebalances visible panes.'}</small>
    <button onClick={() => notes.setWorkspace(previous => ({ ...previous, widths: { ...previous.widths, [previous.preset]: { ...defaultWidths[previous.preset] } } }))}>Reset widths</button>
    <label>Appearance<select aria-label="Appearance" value={notes.theme} onChange={event => notes.setTheme(event.target.value === 'dark' ? 'dark' : 'light')}><option value="light">Light</option><option value="dark">Charcoal</option></select></label>
    <hr/><button onClick={() => { close(); notes.lifecycle.choose(null, true); }}>Archive / Trash</button><Link href={`/orgs/${model.orgId}/airunote/library`} onClick={close}>Open library ↗</Link>
    <label className="an-rail-check"><input type="checkbox" checked={model.batchMode} onChange={event => model.setBatchMode(event.target.checked)} />Batch actions{model.batchIds.length ? ` · ${model.batchIds.length} selected` : ''}</label>
    {model.batchMode && <div className="airunote-book an-rail-batch" data-theme={notes.theme}><BatchTools model={model}/></div>}
  </>}</RailPopover>, targets.settings)}</>;
}
