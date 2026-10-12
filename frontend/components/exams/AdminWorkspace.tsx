'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useAdminRouter } from './AdminNavigation';
import { AdminDialog } from './AdminDialog';
import { useOrgSession } from '@/providers/OrgSessionProvider';

export function AdminWorkspace({
  children,
  current = 'Exams',
  dirty = false,
}: {
  children: ReactNode;
  current?: string;
  dirty?: boolean;
}) {
  const router = useAdminRouter();
  const [leaveHref, setLeaveHref] = useState<string | null>(null);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const navigate = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>(
        'a[href]',
      );
      if (
        dirtyRef.current &&
        link &&
        link.target !== '_blank' &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey
      ) {
        e.preventDefault();
        e.stopPropagation();
        setLeaveHref(link.href);
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', navigate, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', navigate, true);
    };
  }, []);
  const { activeOrgId } = useOrgSession();
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    try {
      setTheme(sessionStorage.getItem('exam-admin-theme') || 'light');
    } catch {}
  }, []);
  return (
    <div className="admin-exams" data-theme={theme}>
      <div className="admin-workspace-nav">
        <nav aria-label="Assessment workspace">
          {activeOrgId &&
            [
              ['Exams', 'exams'],
              ['Templates', 'exam-templates'],
              ['Files', 'files'],
              ['Workspace settings', 'settings'],
            ].map(([name, route]) => (
              <Link
                key={route}
                aria-current={current === name ? 'page' : undefined}
                href={`/orgs/${activeOrgId}/${route}`}
              >
                {name}
              </Link>
            ))}
        </nav>
        <button
          type="button"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} admin theme`}
          onClick={() => {
            const next = theme === 'light' ? 'dark' : 'light';
            setTheme(next);
            try {
              sessionStorage.setItem('exam-admin-theme', next);
            } catch {}
          }}
        >
          {theme === 'light' ? 'Dark' : 'Light'} theme
        </button>
      </div>
      {leaveHref && (
        <AdminDialog
          title="Leave without saving?"
          onClose={() => setLeaveHref(null)}
        >
          <p>
            Your local edits have not been saved. Keep editing or discard them
            to leave.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              className="rounded-lg border px-4 py-3"
              onClick={() => setLeaveHref(null)}
            >
              Keep editing
            </button>
            <button
              type="button"
              className="rounded-lg bg-red-700 px-4 py-3 text-white"
              onClick={() => {
                dirtyRef.current = false;
                router.push(leaveHref);
                setLeaveHref(null);
              }}
            >
              Discard & leave
            </button>
          </div>
        </AdminDialog>
      )}
      {children}
    </div>
  );
}

export function AdminSubnav<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <nav className="admin-subnav" aria-label={label}>
      {items.map(([key, name]) => (
        <button
          type="button"
          key={key}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
        >
          {name}
        </button>
      ))}
    </nav>
  );
}
