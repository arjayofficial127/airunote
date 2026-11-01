'use client';
import { useState } from 'react';
import { folderLabel } from '@/components/book/domain';
import { collectionLabels, type CollectionKind } from '@/lib/collections';
import type { NotesModel } from './useNotesWorkspace';
import { destinationKey } from './destinations';
import { NotesIcon, collectionIcon } from './NotesIcon';
import { PaneMenu } from './PaneMenu';
import { NewCollectionDialog } from './CollectionDialogs';

export function DestinationTabs({ notes }: { notes: NotesModel }) {
  const active = notes.panes.lenses.find(pane => pane.id === notes.panes.activeLens);
  function name(key: string, folderId: string) {
    return key === 'calendar' ? 'Calendar' : key === 'plan' ? 'Plan' : key.startsWith('collection:')
      ? notes.collections.data?.find(item => key === `collection:${item.id}`)?.name ?? 'Collection'
      : folderLabel(notes.model.folders.find(folder => folder.id === folderId)?.humanId);
  }
  return <div className="an-destination-bar"><div role="tablist" aria-label="Open destinations" className="an-destination-tabs">
    {notes.panes.destinations.map((tab, index, tabs) => <span key={tab.key} data-selected={active && destinationKey(active) === tab.key}>
      <button role="tab" aria-controls="notes-destination-content" tabIndex={active && destinationKey(active) === tab.key ? 0 : -1} aria-selected={!!active && destinationKey(active) === tab.key} title={name(tab.key, tab.pane.folderId)} onClick={() => notes.activateDestination(tab.key)} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); const offset = event.key === 'ArrowLeft' ? -1 : 1;
        if (event.altKey) { notes.moveResource(tab.key, offset); return; }
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + offset + tabs.length) % tabs.length;
        notes.activateDestination(tabs[next]!.key);
        event.currentTarget.closest('[role=tablist]')?.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus();
      }}>{name(tab.key, tab.pane.folderId)}</button><button aria-label={`Close ${name(tab.key, tab.pane.folderId)} destination`} onClick={() => notes.closeResource(tab.key)}>×</button>
    </span>)}
  </div>{active && !notes.panes.destinationsClosed && <PaneMenu label="Tab order"><small>Move active tab</small><button data-menu-action onClick={() => notes.moveResource(destinationKey(active), -1)}>Move left</button><button data-menu-action onClick={() => notes.moveResource(destinationKey(active), 1)}>Move right</button></PaneMenu>}</div>;
}

export function WorkspaceLibrary({ notes }: { notes: NotesModel }) {
  const [query, setQuery] = useState(''), [kind, setKind] = useState<CollectionKind | null>(null);
  const active = notes.panes.lenses.find(pane => pane.id === notes.panes.activeLens);
  const key = active && !notes.panes.destinationsClosed ? destinationKey(active) : '';
  return <section className="an-workspace-library" aria-label="Workspace destinations">
    <div className="an-library-tools"><button aria-current={key === 'calendar' ? 'page' : undefined} onClick={() => notes.openTool('calendar')}><NotesIcon name="calendar"/>Calendar</button><button aria-current={key === 'plan' ? 'page' : undefined} onClick={() => notes.openTool('plan')}><NotesIcon name="list"/>Plan</button></div>
    <details><summary>Collections <small>{notes.collections.data?.length ?? 0}</small></summary><div className="an-library-controls"><input aria-label="Find collection" placeholder="Find a collection…" value={query} onChange={event => setQuery(event.target.value)}/><PaneMenu label="New collection">{(Object.keys(collectionLabels) as CollectionKind[]).map(value => <button data-menu-action key={value} onClick={() => { if (notes.allowDestinationChange()) setKind(value); }}>New {collectionLabels[value]}</button>)}</PaneMenu></div><div className="an-library-list">{notes.collections.data?.filter(item => item.name.toLowerCase().includes(query.toLowerCase())).map(item => <button key={item.id} aria-current={key === `collection:${item.id}` ? 'page' : undefined} title={item.name} onClick={() => notes.openCollection(notes.panes.activeLens ?? notes.panes.lenses[0]!.id, item.id)}><NotesIcon name={collectionIcon[item.config.kind]}/><span>{item.name}</span></button>)}{notes.collections.error && <button onClick={() => void notes.collections.refetch()}>Retry collections</button>}</div></details>
    {kind && <NewCollectionDialog notes={notes} kind={kind} folderId={notes.model.rootFolderId} close={() => setKind(null)} open={(id, home) => notes.openCollection(notes.panes.activeLens ?? notes.panes.lenses[0]!.id, id, home, true)}/>}
  </section>;
}
