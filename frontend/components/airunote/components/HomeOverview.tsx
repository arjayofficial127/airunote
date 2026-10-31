'use client';

import Link from 'next/link';
import type { AiruDocumentMetadata, AiruFolder } from '../types';
import { FileTypeChip } from './FileTypeChip';
import { getFolderTypeIcon } from '../utils/folderTypeIcon';

interface HomeOverviewProps {
  orgId: string;
  firstName: string;
  documents: AiruDocumentMetadata[];
  folderCount: number;
  documentCount: number;
  updatedCount: number;
  pinnedFolders: AiruFolder[];
  pinnedDocuments: AiruDocumentMetadata[];
}

export function HomeOverview({ orgId, firstName, documents, folderCount, documentCount, updatedCount, pinnedFolders, pinnedDocuments }: HomeOverviewProps) {
  const base = `/orgs/${orgId}/airunote`;
  return <header className="workspace-home-overview border-b border-slate-200/80 bg-white px-4 py-5 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-[1400px]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="mb-1 text-xs font-semibold uppercase tracking-widest text-blue-600">Your workspace</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back{firstName ? `, ${firstName}` : ''}.</h1></div>
        <p className="pt-1 text-xs leading-6 text-slate-500">{folderCount} folders <span aria-hidden="true">·</span> {documentCount} documents <span aria-hidden="true">·</span> {updatedCount} updated this week</p>
      </div>
      {documents.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-slate-50 px-3 py-2.5">
        <h2 className="shrink-0 text-xs font-semibold text-slate-500">Continue working</h2>
        {documents.map(doc => <Link key={doc.id} href={`${base}/document/${doc.id}`} className="flex min-w-0 max-w-full items-center gap-2 rounded-md text-sm text-slate-700 hover:text-blue-700 focus-visible:outline-blue-600" title={doc.name}>
          <FileTypeChip type={doc.type} /><span className="max-w-[230px] truncate">{doc.name}</span><span aria-hidden="true" className="text-slate-400">↗</span>
        </Link>)}
      </div>}
      {(pinnedFolders.length > 0 || pinnedDocuments.length > 0) && <nav aria-label="Pinned content" className="mt-3 flex flex-wrap gap-3 text-sm"><span className="text-slate-500">Pinned</span>
        {pinnedFolders.map(folder => <Link key={folder.id} href={`${base}/folder/${folder.id}`} className="text-blue-700">{getFolderTypeIcon(folder.type)} {folder.humanId}</Link>)}
        {pinnedDocuments.map(doc => <Link key={doc.id} href={`${base}/document/${doc.id}`} className="text-blue-700">{doc.name}</Link>)}
      </nav>}
    </div>
  </header>;
}
