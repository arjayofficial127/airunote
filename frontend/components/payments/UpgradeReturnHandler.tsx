'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useOrgSession } from '@/providers/OrgSessionProvider';
import { toast } from '@/lib/toast';

export function UpgradeReturnHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { refetch } = useOrgSession();
  const handledUpgradeReturnRef = useRef<string | null>(null);

  useEffect(() => {
    const upgraded = searchParams.get('upgraded');
    const searchKey = searchParams.toString();

    if (upgraded !== '1') {
      handledUpgradeReturnRef.current = null;
      return;
    }

    if (handledUpgradeReturnRef.current === searchKey) {
      return;
    }

    handledUpgradeReturnRef.current = searchKey;

    void (async () => {
      try {
        await refetch();
        toast("🎉 You're now on Pro!", 'success');
      } finally {
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.delete('upgraded');
        const nextQuery = nextParams.toString();
        const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
        router.replace(nextUrl);
      }
    })();
  }, [pathname, refetch, router, searchParams]);

  return null;
}