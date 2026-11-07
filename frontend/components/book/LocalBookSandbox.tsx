'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { OrgSessionContext } from '@/providers/OrgSessionProvider';
import { BookContentContext } from '@/providers/hydratedContent/BookContentProvider';
import { useAirunoteStore } from '@/components/airunote/stores/airunoteStore';
import type { AiruFolder, AiruDocument } from '@/components/airunote/types';
import { defaultPlanning, editablePlanning, record, readPlanning, readBookConfig } from '@/lib/book';
import { BookServicesContext } from './BookServicesContext';
import { BookWorkspace } from './BookWorkspace';
import { today, monday, addDays } from './domain';

const orgId = '10000000-0000-4000-8000-000000000001';
const userId = '20000000-0000-4000-8000-000000000001';
const rootId = '30000000-0000-4000-8000-000000000001';
function fixtures() {
  const stamp = new Date();
  const folders: AiruFolder[] = ['J', 'Everyday life', 'Personal', 'Physical work', 'Income', 'Find jobs'].map((humanId, index) => ({ id: `30000000-0000-4000-8000-00000000000${index + 1}`, orgId, ownerUserId: userId, parentFolderId: index === 0 || index === 1 || index === 4 ? rootId : index < 4 ? '30000000-0000-4000-8000-000000000002' : '30000000-0000-4000-8000-000000000005', humanId, type: index === 2 || index === 3 || index === 5 ? 'project' : 'box', visibility: 'private', createdAt: stamp, metadata: null }));
  const documents: AiruDocument[] = ['Prepare presentation', 'Lunch with Mahal', 'Monday plan', 'Update portfolio', 'Review opportunities', 'A useful idea'].map((name, index) => {
    const planning = defaultPlanning(index === 1 ? 'event' : index === 5 ? 'note' : 'task', index !== 5);
    if (index === 0 || index === 1) planning.plan = { kind: 'day', date: today(), time: index === 0 ? '09:00' : '14:00', duration: index === 0 ? 60 : null };
    if (index === 2 || index === 4) planning.plan = { kind: 'week', start: monday(today()) };
    if (index === 3) planning.status = 'complete';
    return { id: `40000000-0000-4000-8000-00000000000${index + 1}`, folderId: folders[index === 0 || index === 2 ? 3 : index === 1 ? 2 : index === 5 ? 0 : 5]?.id ?? rootId, ownerUserId: userId, type: 'MD', name, content: index === 0 ? 'Outline the story and prepare three useful examples.' : '', canonicalContent: index === 0 ? 'Outline the story and prepare three useful examples.' : '', visibility: 'private', state: 'active', attributes: { airunoteBook: planning }, createdAt: stamp, updatedAt: stamp };
  });
  return { folders, documents };
}
export function LocalBookSandbox() {
  const data = useRef(fixtures()); const fail = useRef(false); const [ready, setReady] = useState(false); const [epoch, setEpoch] = useState(0); const [failure, setFailure] = useState(false);
  fail.current = failure;
  useEffect(() => {
    const previous = useAirunoteStore.getState(); const fixture = data.current;
    previous.clear(); previous.setMetadata(fixture.folders, fixture.documents, {});
    setReady(true);
    return () => { useAirunoteStore.setState(previous, true); };
  }, [epoch]);
  const services = useMemo(() => {
    const guard = () => { if (fail.current) throw new Error('Simulated save failure. Your draft was preserved.'); };
    return {
      async capabilities() { return null; },
      async copy(): Promise<AiruDocument> { throw new Error('Copying items requires the Notes workspace.'); },
      async ready(): Promise<AiruDocument> { throw new Error('Document versions require the Notes workspace.'); },
      async version(): Promise<import('@/lib/book').DocumentRelease & { content: string }> { throw new Error('Document versions require the Notes workspace.'); },
      async daily() { throw new Error('Daily notes are available in the Notes workspace.'); },
      async batch(scope: string, input: import('@/lib/book').BookBatch) {
        const before = data.current.documents;
        try { const result = []; for (const entry of input.entries) { const item = data.current.documents.find(candidate => candidate.id === entry.id); const planning = item ? readPlanning(item.attributes) : null; if (!item || !planning) throw new Error('Unavailable item'); const fields = editablePlanning(planning); const change = input.change; result.push(await this.update(scope, entry.id, { rootFolderId: input.rootFolderId, expectedUpdatedAt: entry.expectedUpdatedAt, ...(change.kind === 'folder' ? { folderId: change.folderId } : {}), planning: change.kind === 'status' ? { ...fields, status: change.status } : change.kind === 'plan' ? { ...fields, plan: change.plan } : { ...fields, processed: true } })); } return result; } catch (error) { data.current.documents = before; throw error; }
      },
      async update(scope: string, id: string, update: import('@/lib/book').BookDocumentUpdate) {
        guard(); const current = data.current.documents.find(document => document.id === id); if (!current || scope !== orgId) throw new Error('Item unavailable');
        if (new Date(current.updatedAt).toISOString() !== update.expectedUpdatedAt) throw new Error('This item changed elsewhere. Reload before saving.');
        const previous = readPlanning(current.attributes); if (!previous) throw new Error('Unsupported planning format');
        const stamp = new Date(Math.max(Date.now(), new Date(current.updatedAt).getTime() + 1));
        const document: AiruDocument = { ...current, name: update.name ?? current.name, folderId: update.folderId ?? current.folderId, content: update.content ?? current.content, canonicalContent: update.content ?? current.canonicalContent, attributes: { ...record(current.attributes), airunoteBook: { ...previous, ...update.planning, history: [...previous.history, { id: crypto.randomUUID(), at: stamp.toISOString(), actorId: userId, action: 'Updated planning' }] } }, updatedAt: stamp };
        data.current.documents = data.current.documents.map(item => item.id === id ? document : item); return document;
      },
      async capture(scope: string, owner: string, folderId: string, name: string, planning: import('@/lib/book').BookPlanning, content = '') {
        guard(); if (scope !== orgId || owner !== userId) throw new Error('Wrong workspace');
        const document: AiruDocument = { id: crypto.randomUUID(), folderId, ownerUserId: owner, name, content, canonicalContent: content, type: 'MD', visibility: 'private', state: 'active', attributes: { airunoteBook: planning }, createdAt: new Date(), updatedAt: new Date() }; data.current.documents.push(document); return document;
      },
      async configure(scope: string, folderId: string, update: import('@/lib/book').BookConfigUpdate) {
        guard(); const folder = data.current.folders.find(item => item.id === folderId); if (!folder || scope !== orgId) throw new Error('Wrong workspace');
        const config = readBookConfig(folder.metadata); if (config?.revision !== update.expectedRevision) throw new Error('Settings changed elsewhere');
        const next = { ...folder, metadata: { ...record(folder.metadata), airunoteBook: { ...update.config, version: 1, revision: config.revision + 1 } } }; data.current.folders = data.current.folders.map(item => item.id === folderId ? next : item); return next;
      },
      async createFolder(request: import('@/components/airunote/types').CreateFolderRequest) {
        guard(); const folder: AiruFolder = { id: crypto.randomUUID(), orgId, ownerUserId: userId, parentFolderId: request.parentFolderId, humanId: request.humanId, type: request.type ?? 'project', metadata: null, visibility: 'private', createdAt: new Date() }; data.current.folders.push(folder); return { success: true, data: { folder } };
      },
    };
  }, []);
  const loader = useMemo(() => ({ loading: null, error: null, async load(id: string) { const document = data.current.documents.find(item => item.id === id); if (document) useAirunoteStore.getState().setDocumentContent(document); } }), []);
  return <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', minHeight: 0 }}><div style={{ padding: '8px 18px', background: '#eef2ff', color: '#334155', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', fontSize: 12 }}><strong>airunote</strong><span>Book review · Isolated sample data · Nothing is sent to your account</span><label><input type="checkbox" checked={failure} onChange={event => setFailure(event.target.checked)} /> Simulate save failure</label><button onClick={() => { data.current = fixtures(); setEpoch(value => value + 1); }}>Reset samples</button><a href="/dev/admin">Examination review</a></div><div style={{ flex: 1, minHeight: 0 }}>{ready && <OrgSessionContext.Provider value={{ status: 'ready', orgs: [], activeOrgId: orgId, activeOrg: null, orgUser: null, roles: ['member'], isRefreshing: false, hasAuthoritativeData: true, error: null, setActiveOrg: () => {}, refetch: async () => {} }}><BookServicesContext.Provider value={services}><BookContentContext.Provider value={loader}><BookWorkspace key={epoch} rootFolderId={rootId} orgId={orgId} userId={userId} /></BookContentContext.Provider></BookServicesContext.Provider></OrgSessionContext.Provider>}</div></div>;
}
