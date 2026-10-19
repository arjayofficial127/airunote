'use client';
import { useEffect, useState } from 'react';
import type { AiruFolder } from '@/components/airunote/types';
import { BookItemRow } from './BookItemRow';
import { DropZone } from './BookDrag';
import { sortItems, subtree } from './domain';
import type { BookWorkspaceModel } from './useBookWorkspace';

function FolderRows({ folder, depth, model, ancestors }: { folder: AiruFolder; depth: number; model: BookWorkspaceModel; ancestors: Set<string> }) {
  const [expanded, setExpanded] = useState(true);
  if (ancestors.has(folder.id)) return null;
  const path = new Set([...ancestors, folder.id]);
  const children = model.folders.filter(child => child.parentFolderId === folder.id && child.id !== folder.id);
  const items = sortItems(model.filtered.filter(item => item.folderId === folder.id && (model.closed || item.planning.status === 'open')));
  const visible = Array.from(subtree(model.folders, folder.id)).some(id => model.selectedFolders.includes(id));
  if (!visible) return null;
  return <>
    <DropZone id={`folder:${folder.id}`} target={{ kind: 'folder', folderId: folder.id }} className={`ab-folder-row ${model.layout === 'columns' ? 'ab-folder-columns' : ''}`}>
      <div className="ab-folder-label" style={{ paddingLeft: Math.min(depth, 6) * 14 }}><button className="ab-disclosure" aria-label={`${expanded ? 'Collapse' : 'Expand'} ${folder.humanId}`} aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? '⌄' : '›'}</button><span aria-hidden="true">{folder.type === 'project' ? '▣' : '▱'}</span><span>{folder.humanId}<small>{items.length} {model.closed ? 'items' : 'open'}</small></span></div>
      {expanded && <div className="ab-folder-items">{items.map(item => <BookItemRow key={item.id} item={item} model={model} compact />)}{items.length === 0 && <small className="ab-empty">No open items</small>}</div>}
    </DropZone>
    {expanded && children.map(child => <FolderRows key={child.id} folder={child} depth={depth + 1} model={model} ancestors={path} />)}
  </>;
}
export function OrganizerPane({ model }: { model: BookWorkspaceModel }) {
  const { setDraftFlag } = model;
  const [name, setName] = useState(''); const [parent, setParent] = useState(model.rootFolderId); const [adding, setAdding] = useState(false);
  useEffect(() => { setDraftFlag('folder', adding && !!name.trim()); return () => setDraftFlag('folder', false); }, [adding, name, setDraftFlag]);
  const roots = model.folders.filter(folder => folder.parentFolderId === model.rootFolderId && folder.id !== model.rootFolderId);
  const loose = model.filtered.filter(item => item.folderId === model.rootFolderId && (model.closed || item.planning.status === 'open'));
  return <section className="ab-pane" hidden={!model.visible.includes('organizer')} aria-label="02 Organizer"><header><h2><small>02</small> Organizer</h2><select aria-label="Organizer view" value={model.layout} onChange={event => model.setLayout(event.target.value === 'tree' ? 'tree' : 'columns')}><option value="columns">Columns</option><option value="tree">Tree</option></select></header>
    <div className="ab-organizer-tools"><label><input type="checkbox" checked={model.closed} onChange={event => model.setClosed(event.target.checked)} /> Show closed</label><button onClick={() => setAdding(value => !value)}>+ Folder</button></div>
    {adding && <form className="ab-small-form" onSubmit={event => { event.preventDefault(); void model.actions.createFolder(parent, name.trim()).then(saved => { if (saved) { setName(''); setAdding(false); } }); }}><label>Parent<select value={parent} onChange={event => setParent(event.target.value)}>{model.folders.map(folder => <option key={folder.id} value={folder.id}>{folder.humanId}</option>)}</select></label><label>Folder name<input required value={name} maxLength={255} onChange={event => setName(event.target.value)} /></label><button disabled={model.actions.busy || !name.trim()}>Create folder</button><button type="button" onClick={() => setAdding(false)}>Cancel</button></form>}
    {model.layout === 'columns' && <div className="ab-columns-heading"><span>Projects and folders</span><span>Direct items</span></div>}
    <div className={`ab-scroll ab-tree ${model.layout === 'tree' ? 'ab-tree-layout' : ''}`}>{roots.map(folder => <FolderRows key={folder.id} folder={folder} depth={0} model={model} ancestors={new Set()} />)}<DropZone id="ab-root-folder" target={{ kind: 'folder', folderId: model.rootFolderId }}><details open={loose.length > 0}><summary>In this folder <span className="ab-count">{loose.length}</span></summary>{sortItems(loose).map(item => <BookItemRow key={item.id} item={item} model={model} compact />)}</details></DropZone>{!roots.length && !loose.length && <p className="ab-empty">Your folders and notes will appear here. Start with a thought or add a folder.</p>}</div>
  </section>;
}
