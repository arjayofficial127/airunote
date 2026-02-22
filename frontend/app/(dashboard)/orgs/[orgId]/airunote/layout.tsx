/**
 * Airunote Layout
 * Wraps all Airunote pages with AirunoteDataProvider
 * Ensures metadata is loaded once when entering Airunote section
 */

'use client';

import { AirunoteDataProvider } from '@/components/airunote/providers/AirunoteDataProvider';

export default function AirunoteLayout({ children }: { children: React.ReactNode }) {
  return (
    <AirunoteDataProvider>
      {children}
    </AirunoteDataProvider>
  );
}
