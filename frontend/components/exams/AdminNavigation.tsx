'use client';
import { createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
// The production path always uses Next navigation. The development sandbox supplies local navigation.
export const LocalAdminNavigation = createContext<{
  push: (href: string) => void;
} | null>(null);
export function useAdminRouter() {
  const router = useRouter();
  return useContext(LocalAdminNavigation) ?? router;
}

export function useLocalAdminSandbox() {
  return Boolean(useContext(LocalAdminNavigation));
}
