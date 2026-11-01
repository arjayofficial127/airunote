'use client';
import { collectionLabels } from '@/lib/collections';
import { folderLabel, planLabel } from '@/components/book/domain';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import type { NotesModel } from './useNotesWorkspace';
import type { NotesLensModel } from './useNotesLens';
import { NotesIcon, collectionIcon } from './NotesIcon';

export function FolderContents({ workspace, notes, mode, paneId }: { workspace: NotesModel; notes: NotesLensModel; mode: 'box' | 'list' | 'details' | 'cards'; paneId: string }) {
  const content = useAirunoteStore(state => state.documentContentById);
  const linkedCollections = new Set(notes.links.filter(item => item.entityType === 'collection').map(item => item.entityId));
  const collections = (workspace.collections.data ?? []).filter(item => ((notes.descendants ? notes.scope.has(item.homeFolderId) : item.homeFolderId === notes.folderId) || linkedCollections.has(item.id)) && item.name.toLowerCase().includes(notes.viewModel.query.toLowerCase()));
  const entries = [
    ...notes.folders.map(folder => ({ key: folder.id, name: folderLabel(folder.humanId), kind: 'Folder', icon: 'folder' as const, link: notes.linkedSpaces.has(folder.id), updated: null as Date | string | null,
      summary: typeof folder.metadata?.description === 'string' ? folder.metadata.description : `${notes.model.folders.filter(value => value.parentFolderId === folder.id).length} folders · ${notes.model.items.filter(value => value.folderId === folder.id).length} notes`, open: () => notes.selectFolder(folder.id) })),
    ...collections.map(item => ({ key: item.id, name: item.name, kind: collectionLabels[item.config.kind], icon: collectionIcon[item.config.kind], link: linkedCollections.has(item.id), updated: item.updatedAt,
      summary: item.config.kind === 'pages' ? `${item.config.pages.length} pages · Chosen references` : item.config.membership.mode === 'chosen' ? 'Chosen references' : `Matching items · ${item.config.membership.status}`, open: () => workspace.openCollection(paneId, item.id) })),
    ...notes.viewModel.filtered.map(item => ({ key: item.id, name: item.name, kind: item.planning.kind[0]!.toUpperCase() + item.planning.kind.slice(1), icon: 'note' as const, link: notes.linkedNotes.has(item.id), updated: item.updatedAt,
      summary: content.get(item.id)?.type !== 'RTF' && content.get(item.id)?.content ? content.get(item.id)!.content.slice(0, 400).replace(/<[^>]*>|[#*_`]/g, '').trim() : `${item.planning.status} · ${planLabel(item.planning.plan, notes.model.planningConfig)}`, open: () => notes.model.open(item) })),
  ].sort((a, b) => notes.viewModel.sort === 'updated' ? +(new Date(b.updated ?? 0)) - +(new Date(a.updated ?? 0)) || a.name.localeCompare(b.name) : notes.viewModel.sort === 'type' ? a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
  const date = (value: Date | string | null) => value && Number.isFinite(+new Date(value)) ? new Date(value).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' }) : '—';
  const name = (entry: typeof entries[number]) => <><NotesIcon name={entry.icon}/><span>{entry.name}</span>{entry.link && <small title="Link to original" aria-label="Link">↗</small>}</>;
  return <><small className="an-contents-count">{entries.length} {entries.length === 1 ? 'item' : 'items'}{notes.descendants ? ' · Including descendants' : ''}</small>
    {mode === 'details' ? <table className="an-details-table" aria-label="Folder contents"><thead><tr><th scope="col">Name</th><th scope="col">Type</th><th scope="col">Updated</th></tr></thead><tbody>{entries.map(entry => <tr key={entry.key}><td><button className="an-content-item" title={entry.name} onClick={entry.open}>{name(entry)}</button></td><td>{entry.kind}</td><td><time dateTime={entry.updated ? new Date(entry.updated).toISOString() : undefined}>{date(entry.updated)}</time></td></tr>)}</tbody></table> :
      <div className={`an-folder-contents an-folder-${mode}`} aria-label="Folder contents">{entries.map(entry => <button key={entry.key} className="an-content-item" title={entry.name} onClick={entry.open}>{name(entry)}{mode === 'cards' && <><p>{entry.summary}</p>{entry.updated && <small>Updated {date(entry.updated)}</small>}</>}</button>)}</div>}
    {!entries.length && <p className="ab-empty">No items here. Create a note, folder or collection from the menu.</p>}
    {workspace.collections.error && <p role="alert">Collections could not load. <button onClick={() => void workspace.collections.refetch()}>Retry</button></p>}</>;
}
