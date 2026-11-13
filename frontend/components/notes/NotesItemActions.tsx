'use client';
import { createContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ItemActionsContext, type DailyItemActions } from '@/components/book/ItemActionsContext';
import { folderLabel, planLabel, type BookItem } from '@/components/book/domain';
import type { AiruDocument, AiruFolder } from '@/components/airunote/types';
import { NewItemChoices } from './NewItemChoices';
import type { NotesModel } from './useNotesWorkspace';
import { useItemCapabilities } from './useItemCapabilities';
import type { LifecycleTarget } from './useNotesLifecycle';

export const FolderActionsContext = createContext<((item: AiruFolder, anchor: HTMLButtonElement) => void) | null>(null);
type ActionMenu = { anchor: HTMLButtonElement } & ({ kind: 'note'; item: BookItem; daily?: DailyItemActions } | { kind: 'folder'; item: AiruFolder });

export function NotesItemActions({ notes, children }: { notes: NotesModel; children: ReactNode }) {
  const { model, lifecycle } = notes;
  const [menu, setMenu] = useState<ActionMenu | null>(null);
  const [view, setView] = useState<'actions' | 'details' | 'rename' | 'move' | 'new'>('actions');
  const [value, setValue] = useState('');
  const [clipboard, setClipboard] = useState<BookItem | null>(null);
  const [undo, setUndo] = useState<AiruDocument | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const copies = useItemCapabilities(model.orgId)?.itemCopies;
  const guarded = model.dirty || model.hasDrafts || model.actions.busy || lifecycle.busy;
  const item = menu?.kind === 'note' ? menu.item : null;
  const daily = menu?.kind === 'note' ? menu.daily : undefined;
  function open(next: ActionMenu) {
    if (menu?.anchor === next.anchor) { setMenu(null); return; }
    setMenu(next);
    setView('actions');
  }
  function close(restore = true) {
    setMenu(null);
    if (restore) menu?.anchor.focus({ preventScroll: true });
  }
  useLayoutEffect(() => {
    if (!menu || !panel.current) return;
    const node = panel.current;
    const position = () => {
      if (!menu.anchor.isConnected) { setMenu(null); return; }
      const anchor = menu.anchor.getBoundingClientRect();
      const viewport = window.visualViewport;
      const leftEdge = (viewport?.offsetLeft ?? 0) + 8;
      const topEdge = (viewport?.offsetTop ?? 0) + 8;
      const right = (viewport?.offsetLeft ?? 0) + (viewport?.width ?? innerWidth) - 8;
      const bottom = (viewport?.offsetTop ?? 0) + (viewport?.height ?? innerHeight) - 8;
      node.style.maxHeight = `${bottom - topEdge}px`;
      const beside = anchor.right + 6 + node.offsetWidth < right;
      const left = beside ? anchor.right + 6 : anchor.right - node.offsetWidth;
      const below = anchor.bottom + 6;
      const top = beside ? anchor.top : below + node.offsetHeight <= bottom ? below : anchor.top - node.offsetHeight - 6;
      node.style.left = Math.max(leftEdge, Math.min(left, right - node.offsetWidth)) + 'px';
      node.style.top = Math.max(topEdge, Math.min(top, bottom - node.offsetHeight)) + 'px';
    };
    position();
    const observer = new ResizeObserver(position);
    observer.observe(node);
    window.addEventListener('resize', position);
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', position);
    node.querySelector<HTMLElement>('input, select, button:not(:disabled)')?.focus({ preventScroll: true });
    return () => { observer.disconnect(); window.removeEventListener('resize', position); viewport?.removeEventListener('resize', position); };
  }, [menu, view]);
  useEffect(() => {
    if (!menu) return;
    const outside = (event: Event) => {
      if (event.target instanceof Node && !panel.current?.contains(event.target) && !menu.anchor.contains(event.target)) setMenu(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMenu(null);
      menu.anchor.focus({ preventScroll: true });
    };
    const scroll = (event: Event) => {
      if (event.target instanceof Node && panel.current?.contains(event.target)) return;
      setMenu(null);
    };
    window.addEventListener('scroll', scroll, true);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('scroll', scroll, true);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [menu]);
  async function duplicate(source: BookItem, folderId: string, pasted = false) {
    close();
    const saved = await model.actions.copy(source, folderId);
    if (!saved) return;
    setUndo(saved);
    model.open({ ...source, ...saved });
    model.actions.setNotice(pasted ? 'Item pasted' : 'Item duplicated');
  }
  async function undoCopy() {
    if (!undo) return;
    if (await lifecycle.change({ kind: 'note', item: undo }, 'trashed')) {
      setUndo(null);
      model.actions.setNotice('Copy removed');
    }
  }
  async function update() {
    if (!item || !value.trim() || guarded) return;
    const saved = await model.actions.update(item, view === 'rename' ? { name: value.trim() } : { folderId: value });
    if (saved) close();
  }
  function archive(target: LifecycleTarget) {
    close();
    void lifecycle.change(target, 'archived');
  }
  return <FolderActionsContext.Provider value={(folder, anchor) => open({ kind: 'folder', item: folder, anchor })}>
    <ItemActionsContext.Provider value={(item, anchor, daily) => open({ kind: 'note', item, anchor, daily })}>
      {children}
      {undo && model.actions.notice && ['Item pasted', 'Item duplicated'].includes(model.actions.notice) && <div className="an-copy-undo" role="group" aria-label="Copy actions">
        <button type="button" disabled={guarded} onClick={() => void undoCopy()}>Undo</button>
        <button type="button" aria-label="Dismiss undo" onClick={() => setUndo(null)}>×</button>
      </div>}
      {menu && <div ref={panel} className="an-item-menu" role="dialog" aria-label={menu.kind === 'note' ? 'Item actions' : 'Folder actions'}>
        {view !== 'new' && <strong>{view === 'details' ? 'Details' : item?.name ?? (menu.kind === 'folder' ? folderLabel(menu.item.humanId) : '')}</strong>}
        {daily && view === 'actions' ? <>
          <button type="button" onClick={() => { close(false); daily.openReflection(); }}>{daily.hasReflection ? 'Daily reflection' : 'Add reflection'}</button>
          <button type="button" onClick={() => setView('details')}>Details</button>
          {daily.save && <button type="button" onClick={() => { close(); daily.save?.(); }}>Save now</button>}
          <button type="button" onClick={() => { close(false); daily.close(); }}>Close note</button>
        </> : view === 'new' && menu.kind === 'folder' ? <NewItemChoices model={model} folderId={menu.item.id} close={close}/>
          : view === 'rename' || view === 'move' ? <form onSubmit={event => { event.preventDefault(); void update(); }}>
            {view === 'rename' ? <label>New title<input value={value} maxLength={255} onChange={event => setValue(event.target.value)}/></label>
              : <label>Move to<select value={value} onChange={event => setValue(event.target.value)}>{model.folders.map(folder => <option key={folder.id} value={folder.id}>{folderLabel(folder.humanId)}</option>)}</select></label>}
            <div><button type="submit" disabled={guarded || !value.trim()}>{view === 'rename' ? 'Rename' : 'Move'}</button><button type="button" onClick={() => setView('actions')}>Back</button></div>
          </form> : <>
            {item && <>
              {daily && <>
                <small className="an-item-menu-status">{planLabel(item.planning.plan, model.planningConfig)} · {item.planning.status}</small>
                <button type="button" disabled={guarded} onClick={() => { close(false); daily.details('planning'); }}>Schedule</button>
                <button type="button" disabled={guarded} onClick={() => { close(false); daily.details('folder'); }}>Move to folder</button>
                <button type="button" disabled={guarded} onClick={() => { close(false); daily.details('note'); }}>Edit planning and context</button>
              </>}
              {copies && <>
                <button type="button" disabled={guarded || item.invalidPlanning} onClick={() => void duplicate(item, item.folderId)}>Duplicate</button>
                <button type="button" disabled={guarded || item.invalidPlanning} onClick={() => { setClipboard(item); close(); model.actions.setNotice('Item copied. Open a folder’s actions to paste.'); }}>Copy item</button>
              </>}
              <button type="button" disabled={guarded || item.invalidPlanning} onClick={() => { setValue(item.name); setView('rename'); }}>Rename</button>
              {!daily && <button type="button" disabled={guarded || item.invalidPlanning} onClick={() => { setValue(item.folderId); setView('move'); }}>Move to…</button>}
            </>}
            {menu.kind === 'folder' && <>
              <button type="button" onClick={() => setView('new')}>New item here</button>
              {copies && <button type="button" disabled={guarded || !clipboard} onClick={() => clipboard && void duplicate(clipboard, menu.item.id, true)}>
                Paste item here{clipboard && <small>{clipboard.name}</small>}
              </button>}
            </>}
            <hr/>
            <button type="button" disabled={guarded} onClick={() => archive(menu)}>Archive</button>
            <button type="button" disabled={guarded} onClick={() => { close(); lifecycle.choose(menu, false, true); }}>Delete…</button>
            {daily && <button type="button" onClick={() => setView('actions')}>Back</button>}
          </>}
      </div>}
    </ItemActionsContext.Provider>
  </FolderActionsContext.Provider>;
}
