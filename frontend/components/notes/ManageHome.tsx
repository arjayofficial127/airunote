'use client';
import Link from 'next/link';
import { useOrgSession } from '@/providers/OrgSessionProvider';
export function ManageHome() {
  const { activeOrgId, roles } = useOrgSession();
  if (!activeOrgId) return <p role="status">Opening workspace…</p>;
  if (!roles.some(role => role.toLowerCase() === 'admin')) return <p role="alert" className="p-8">Only workspace admins can manage this organization.</p>;
  const entries = [['Settings', 'Workspace, billing and preferences', 'settings'], ['Members', 'People and access', 'members'], ['Files', 'Uploaded files', 'files'], ['Exam templates', 'Reusable examination templates', 'exam-templates'], ['Notes library', 'Folders and existing views', 'airunote/library']];
  return <div className="mx-auto max-w-4xl p-8"><h1 className="text-2xl font-semibold">Manage</h1><p className="mt-2 text-slate-500">Your workspace settings and administration.</p><div className="mt-8 grid gap-4 sm:grid-cols-2">{entries.map(([name, description, route]) => <Link key={route} href={`/orgs/${activeOrgId}/${route}`} className="rounded-xl border bg-white p-5 hover:border-blue-300"><h2 className="font-semibold">{name}</h2><p className="mt-2 text-sm text-slate-500">{description}</p></Link>)}</div></div>;
}
