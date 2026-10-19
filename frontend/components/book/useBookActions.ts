'use client';
import { useEffect, useRef, useState } from 'react';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import { errorMessage } from './services';
import { useBookServices } from './BookServicesContext';
import { editablePlanning } from '@/lib/book';
import { defaultPlanning, type PlanningFields, type CalendarPlan, type BookConfig, type BookConfigFields, type BookDocumentUpdate, type BookBatch } from '@/lib/book';
import type { BookItem } from './domain';
import type { AiruDocument } from '@/components/airunote/types';

export function useBookActions(orgId: string, userId: string, rootFolderId: string, config: BookConfig) {
  const services = useBookServices();
  const { activeOrgId } = useOrgSession(); const currentOrg = useRef(activeOrgId); currentOrg.current = activeOrgId;
  const alive = useRef(true); const pending = useRef(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const available = () => alive.current && currentOrg.current === orgId;
  function commit(document: AiruDocument) {
    if (!available()) return;
    const store = useAirunoteStore.getState(); store.updateDocumentMetadata(document); store.setDocumentContent(document);
  }
  async function run<T>(action: () => Promise<T>): Promise<T | null> {
    if (pending.current || !available()) return null;
    pending.current = true; setBusy(true); setError(null); setNotice(null);
    try { const result = await action(); return available() ? result : null; }
    catch (failure) { if (available()) setError(errorMessage(failure)); return null; }
    finally { pending.current = false; if (available()) setBusy(false); }
  }
  async function update(item: BookItem, changes: Omit<BookDocumentUpdate, 'rootFolderId' | 'expectedUpdatedAt'>, expectedUpdatedAt?: string) {
    if (item.invalidPlanning) { setError('Unsupported planning data. Open this item in its original editor.'); return null; }
    return run(async () => {
      const document = await services.update(orgId, item.id, { ...changes, rootFolderId, expectedUpdatedAt: expectedUpdatedAt ?? new Date(item.updatedAt).toISOString() });
      commit(document); setNotice('Saved'); return document;
    });
  }
  async function capture(name: string, kind: PlanningFields['kind'], plan: CalendarPlan = { kind: 'unplanned' }, folderId = rootFolderId, content = '', fields?: PlanningFields) {
    return run(async () => {
      const planning = { ...defaultPlanning(kind, folderId !== rootFolderId), ...fields, plan, processed: fields?.processed ?? folderId !== rootFolderId };
      const document = await services.capture(orgId, userId, folderId, name, planning, content, rootFolderId); commit(document); setNotice('Captured'); return document;
    });
  }
  async function configure(fields: BookConfigFields) {
    return run(async () => {
      const folder = await services.configure(orgId, rootFolderId, { expectedRevision: config.revision, config: { sprints: fields.sprints, views: fields.views, templates: fields.templates } });
      if (available()) useAirunoteStore.getState().updateFolder(folder); setNotice('Book settings saved'); return folder;
    });
  }
  async function createFolder(parentId: string, name: string, type: 'project' | 'box' = 'project') {
    return run(async () => {
      const response = await services.createFolder({ orgId, userId, parentFolderId: parentId, humanId: name, type });
      if (!response.success) throw new Error(response.error?.message ?? 'Folder could not be created');
      if (available()) useAirunoteStore.getState().addFolder(response.data.folder); return response.data.folder;
    });
  }
  function fields(item: BookItem): PlanningFields { return editablePlanning(item.planning); }
  async function cycle(item: BookItem) {
    const status = item.planning.status === 'open' ? 'complete' : item.planning.status === 'complete' ? 'cancelled' : 'open';
    return update(item, { planning: { ...fields(item), status } });
  }
  async function batch(items: BookItem[], change: BookBatch['change']) {
    return run(async () => { const documents = await services.batch(orgId, { rootFolderId, entries: items.map(item => ({ id: item.id, expectedUpdatedAt: new Date(item.updatedAt).toISOString() })), change }); documents.forEach(commit); setNotice(`Updated ${documents.length} items`); return documents; });
  }
  return { update, capture, configure, createFolder, cycle, batch, fields, busy, error, setError, notice };
}
export type BookActions = ReturnType<typeof useBookActions>;
