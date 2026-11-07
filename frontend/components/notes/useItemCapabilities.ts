'use client';
import { useQuery } from '@tanstack/react-query';
import { useBookServices } from '@/components/book/BookServicesContext';

export function useItemCapabilities(orgId: string) {
  const services = useBookServices();
  return useQuery({
    queryKey: ['airunote-kind-capabilities', orgId],
    queryFn: () => services.capabilities(orgId),
    staleTime: 60000,
    retry: false,
  }).data;
}
