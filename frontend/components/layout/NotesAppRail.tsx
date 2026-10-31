'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './notes-app-rail.css';

function AppIcon({ kind }: { kind: 'notes' | 'exams' | 'manage' }) {
  return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">{kind === 'notes' ? <><path d="M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h6" /></> : kind === 'exams' ? <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 3h6v3H9zM8 11l2 2 5-5M9 17h6" /></> : <><circle cx="12" cy="12" r="4" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2" /></>}</svg>;
}

export function NotesAppRail({ orgId, isAdmin, onProfile, onLogout, initials }: { orgId: string; isAdmin: boolean; onProfile: () => void; onLogout: () => void; initials: string }) {
  const pathname = usePathname();
  const entries = [{ key: 'notes' as const, title: 'Notes', href: `/orgs/${orgId}/airunote`, active: pathname.includes('/airunote') }, { key: 'exams' as const, title: 'Exams', href: `/orgs/${orgId}/exams`, active: pathname.includes('/exams') }, ...(isAdmin ? [{ key: 'manage' as const, title: 'Manage', href: `/orgs/${orgId}/manage`, active: /\/(manage|settings|members|files)(\/|$)/.test(pathname) }] : [])];
  return <aside className="an-app-rail" aria-label="Apps"><Link className="an-brand" href={`/orgs/${orgId}/airunote`} aria-label="Airunote Notes">∿</Link><nav>{entries.map(entry => <Link key={entry.key} href={entry.href} aria-current={entry.active ? 'page' : undefined}><AppIcon kind={entry.key} /><span>{entry.title}</span></Link>)}</nav><div className="an-rail-account"><button aria-label="Your account" onClick={onProfile}>{initials}</button><Link href="/orgs" title="Switch workspace" aria-label="Switch workspace">⇄</Link><button title="Sign out" aria-label="Sign out" onClick={onLogout}>↪</button></div></aside>;
}
