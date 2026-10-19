'use client';
import Link from 'next/link';
import { useOrgSession } from '@/providers/OrgSessionProvider';
export function BookViewLink({ folderId, className }: { folderId: string | null; className?: string }) {
  const { activeOrgId } = useOrgSession();
  if (!activeOrgId || !folderId) return null;
  return <Link className={className} href={`/orgs/${activeOrgId}/airunote/book/${folderId}`} title="Open Inbox, Organizer, Calendar, and Context">Book</Link>;
}
