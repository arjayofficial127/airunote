'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAirunoteStore } from '../stores/airunoteStore';
import { WorkspaceFocusButton } from '@/components/layout/WorkspaceFocus';
import type { AiruDocument } from '../types';

export function DocumentBreadcrumbs({ document, orgId, userId }: { document: AiruDocument; orgId: string; userId: string }) {
  const search = useSearchParams();
  const folders = useAirunoteStore(state => state.foldersById);
  const hint = search.get('bookFolderId');
  const bookRoot = hint ? folders.get(hint) : null;
  const canReturn = bookRoot?.orgId === orgId && bookRoot.ownerUserId === userId;
  const folder = folders.get(document.folderId);
  const folderName = folder?.humanId === '__user_root__' ? 'Home' : folder?.humanId ?? 'Folder';
  const base = `/orgs/${orgId}/airunote`;
  return <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 sm:px-6">
    <nav aria-label="Document location" className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
      <Link className="shrink-0 rounded py-2 font-medium text-blue-700 hover:underline" href={canReturn ? `${base}/book/${bookRoot.id}` : base}>{canReturn ? '← Back to Book' : 'Home'}</Link>
      {folder && folderName !== 'Home' && <><span aria-hidden="true">/</span><Link href={`${base}/folder/${folder.id}`} className="max-w-[160px] truncate hover:text-blue-700">{folderName}</Link></>}
      <span aria-hidden="true">/</span><span aria-current="page" className="max-w-[220px] truncate">{document.name}</span>
    </nav>
    <WorkspaceFocusButton />
  </div>;
}
