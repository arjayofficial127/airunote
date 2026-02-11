'use client';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // This layout is just a pass-through since the parent (dashboard)/layout.tsx
  // already handles the sidebar rendering
  return <>{children}</>;
}

