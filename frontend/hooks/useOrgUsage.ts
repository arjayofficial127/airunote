'use client';

import { useEffect, useState } from 'react';
import { orgsApi, type OrgUsage } from '@/lib/api/orgs';

export function useOrgUsage(orgId: string | null | undefined): OrgUsage | null {
  const [usage, setUsage] = useState<OrgUsage | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadUsage = async () => {
      if (!orgId) {
        setUsage(null);
        return;
      }

      try {
        const response = await orgsApi.getUsage(orgId);
        if (isActive) {
          setUsage(response.data);
        }
      } catch {
        if (isActive) {
          setUsage(null);
        }
      }
    };

    void loadUsage();

    return () => {
      isActive = false;
    };
  }, [orgId]);

  return usage;
}