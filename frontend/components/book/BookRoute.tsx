'use client';
import { useParams } from 'next/navigation';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { useAuthSession } from '@/providers/AuthSessionProvider';
import { BookWorkspace } from './BookWorkspace';
export function BookRoute() {
  const { folderId } = useParams<{ folderId: string }>();
  const { activeOrgId } = useOrgSession(); const auth = useAuthSession();
  if (!activeOrgId || !auth.user) return <p role="status">Loading workspace…</p>;
  if (!/^[0-9a-f-]{36}$/i.test(folderId)) return <p role="alert">Choose a valid folder.</p>;
  return <BookWorkspace key={`${activeOrgId}:${auth.user.id}:${folderId}`} rootFolderId={folderId} orgId={activeOrgId} userId={auth.user.id} />;
}
