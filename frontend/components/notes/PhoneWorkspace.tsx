'use client';

import Image from 'next/image';
import { useId, useRef, useState } from 'react';
import { folderLabel, formatDay, today } from '@/components/book/domain';
import { dailyNoteDate } from '@/lib/book';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { NewItemChoices } from './NewItemChoices';
import { NotesIcon } from './NotesIcon';
import { collectionLabels } from '@/lib/collections';
import { folderPath, type NotesModel } from './useNotesWorkspace';
import type { PhoneScreen } from './usePhoneWorkspace';

const dock = [
  ['today', 'Today', 'sun'],
  ['folders', 'Browse', 'folder'],
  ['search', 'Search', 'search'],
  ['more', 'More', 'more'],
] as const;

function brand() {
  return <div className="an-phone-brand"><Image src="/airunote/airunote_logo.png" width={24} height={24} alt="" />airunote</div>;
}

export function PhoneDock({ notes, screen, show }: { notes: NotesModel; screen: PhoneScreen; show: (screen: PhoneScreen) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const captureFolder = screen === 'view' && !notes.panes.destinationsClosed
    ? notes.panes.lenses.find(pane => pane.id === notes.panes.activeLens)?.folderId
    : screen === 'folders' ? notes.panes.folders.find(pane => pane.id === notes.panes.activeFolder)?.folderId : notes.model.rootFolderId;

  function tab([key, label, icon]: typeof dock[number]) {
    const active = screen === key || key === 'folders' && (screen === 'view' || screen === 'inbox');
    return <button key={key} type="button" aria-current={active ? 'page' : undefined} onClick={() => show(key)}><NotesIcon name={icon}/>{label}</button>;
  }

  return <>
    <nav className="an-phone-dock" aria-label="Phone workspace">
      {dock.slice(0, 2).map(tab)}
      <button type="button" aria-label="New item" aria-haspopup="dialog" aria-controls={id} disabled={notes.model.loading} onClick={() => dialog.current?.showModal()}><span className="an-phone-plus" aria-hidden="true">+</span>New</button>
      {dock.slice(2).map(tab)}
    </nav>
    <dialog id={id} ref={dialog} className="an-phone-new" aria-label="New item">
      <button type="button" className="an-phone-close" aria-label="Close New item" onClick={() => dialog.current?.close()}>×</button>
      <NewItemChoices model={notes.model} folderId={captureFolder} close={() => dialog.current?.close()} />
    </dialog>
  </>;
}

export function PhoneToday({ notes, resume, resumeView }: { notes: NotesModel; resume: () => void; resumeView: () => void }) {
  const { model, editors } = notes;
  const date = today();
  const daily = model.items.find(item => dailyNoteDate(item) === date);
  const recent = [...model.items].filter(item => item.id !== daily?.id).sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 6);
  const active = editors.state.tabs.find(tab => tab.key === editors.state.active);
  const pane = notes.panes.lenses.find(item => item.id === notes.panes.activeLens);
  const currentCollection = pane?.viewId.startsWith('collection:') ? notes.collections.data?.find(item => pane.viewId === `collection:${item.id}`) : undefined;
  const currentView = currentCollection?.name ?? (pane?.viewId === 'agenda' ? 'Plan' : pane?.viewId === 'calendar' ? 'Calendar' : model.folders.find(item => item.id === pane?.folderId)?.humanId);


  return <section className="an-phone-page" aria-label="Today">
    {brand()}
    <header><h1>Today</h1><p>{formatDay(date, { weekday: 'long', day: 'numeric', month: 'long' })}</p></header>
    <section className="an-phone-daily">
      <small>Daily note</small>
      <h2>{daily?.name ?? 'Your daily note'}</h2>
      <button type="button" disabled={model.loading || model.actions.busy} onClick={() => void notes.openToday(true)}>{daily ? 'Keep writing' : 'Open today’s note'} <span aria-hidden="true">↗</span></button>
    </section>
    {active && <button className="an-phone-resume" type="button" onClick={resume}>
      <NotesIcon name="edit"/><span><strong>Resume writing</strong><small>{active.name.trim() || 'Untitled note'}{active.dirty ? ' · Draft' : ''}</small></span><span aria-hidden="true">›</span>
    </button>}
    {notes.workspace.folderChosen && !notes.panes.destinationsClosed && currentView && <button className="an-phone-resume" type="button" onClick={resumeView}>
      <NotesIcon name="folder"/><span><strong>Resume workspace view</strong><small>{folderLabel(currentView)}</small></span><span aria-hidden="true">›</span>
    </button>}
    <h2 className="an-phone-heading">Recent</h2>
    {recent.length ? <ul className="an-phone-results">{recent.map(item => <li key={item.id}>
      <button type="button" onClick={() => model.open(item)}><NotesIcon name="note"/><span><strong>{item.name}</strong><small>{folderLabel(model.folders.find(folder => folder.id === item.folderId)?.humanId)}</small></span></button>
    </li>)}</ul> : <p>{model.loading ? 'Loading notes…' : 'Your recent notes will appear here.'}</p>}
  </section>;
}

export function PhoneSearch({ notes }: { notes: NotesModel }) {
  const [query, setQuery] = useState('');
  const content = useAirunoteStore(state => state.documentContentById);
  const { model } = notes;
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (value: string) => terms.every(term => value.toLowerCase().includes(term));
  const location = (id: string) => folderPath(model.folders, id).map(folder => folderLabel(folder.humanId)).join(' / ');
  const items = terms.length ? model.items.filter(item => matches(`${item.name} ${location(item.folderId)} ${content.get(item.id)?.content ?? ''}`)).sort((a, b) => a.name.localeCompare(b.name)) : [];
  const folders = terms.length ? model.folders.filter(folder => folder.id !== model.rootFolderId && matches(location(folder.id))).sort((a,b) => a.humanId.localeCompare(b.humanId)) : [];
  const collections = terms.length ? (notes.collections.data ?? []).filter(item => matches(`${item.name} ${collectionLabels[item.config.kind]}`)) : [];

  return <section className="an-phone-page" aria-label="Search">
    <header><h1>Search</h1></header>
    <label className="an-phone-search"><NotesIcon name="search"/><input type="search" aria-label="Search notes, folders and collections" placeholder="Find a note, folder or collection…" value={query} onChange={event => setQuery(event.target.value)} /></label>
    <p className="an-phone-search-status" role="status">{terms.length ? `${items.length + folders.length + collections.length} results` : 'Search your workspace'}</p>
    {!!(items.length || folders.length || collections.length) && <ul className="an-phone-results">
      {items.map(item => <li key={`note:${item.id}`}><button type="button" onClick={() => model.open(item)}><NotesIcon name="note"/><span><strong>{item.name}</strong><small>{location(item.folderId)}</small></span></button></li>)}
      {folders.map(folder => <li key={`folder:${folder.id}`}><button type="button" onClick={() => notes.selectFolder(notes.panes.activeFolder, folder.id)}><NotesIcon name="folder"/><span><strong>{folderLabel(folder.humanId)}</strong><small>{location(folder.parentFolderId)}</small></span></button></li>)}
      {collections.map(item => <li key={`collection:${item.id}`}><button type="button" onClick={() => notes.openCollection(notes.panes.activeLens ?? notes.panes.lenses[0]!.id, item.id, item.homeFolderId)}><NotesIcon name="book"/><span><strong>{item.name}</strong><small>{collectionLabels[item.config.kind]} · {location(item.homeFolderId)}</small></span></button></li>)}
    </ul>}
  </section>;
}

export function PhoneMore({ notes, full }: { notes: NotesModel; full: () => void }) {
  return <section className="an-phone-page" aria-label="More">
    <header><h1>More</h1></header>
    <ul className="an-phone-results">
      <li><button type="button" onClick={() => notes.openTool('calendar')}><NotesIcon name="calendar"/>Calendar</button></li>
      <li><button type="button" onClick={() => notes.openTool('plan')}><NotesIcon name="list"/>Plan</button></li>
      <li><button type="button" onClick={() => notes.lifecycle.choose(null, true)}><NotesIcon name="box"/>Archive / Trash</button></li>
      <li><button type="button" onClick={full}><NotesIcon name="details"/><span><strong>Full workspace</strong><small>Use side-by-side panes and layouts</small></span></button></li>
    </ul>
  </section>;
}
