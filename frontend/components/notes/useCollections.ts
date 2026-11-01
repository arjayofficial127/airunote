'use client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import type { Collection, CollectionDetail } from '@/lib/collections';
export async function collectionRequest<T>(orgId: string, path = '', method = 'GET', data?: unknown): Promise<T> {
  const response = await apiClient.request<{ success: boolean; data: T }>({ url: `/orgs/${orgId}/airunote/collections${path}`, method, data });
  return response.data.data;
}
export function useCollections(orgId: string) {
  return useQuery({ queryKey: ['collections', orgId], queryFn: () => collectionRequest<Collection[]>(orgId), staleTime: 15000 });
}
export function useCollection(orgId: string, id: string) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['collection', orgId, id], queryFn: () => collectionRequest<CollectionDetail>(orgId, '/' + id), staleTime: 15000 });
  async function change(path: string, method: string, data: unknown) {
    const result = await collectionRequest<CollectionDetail>(orgId, '/' + id + path, method, data);
    client.setQueryData(['collection', orgId, result.collection.id], result);
    await client.invalidateQueries({ queryKey: ['collections', orgId] });
    return result;
  }
  return { ...query, change };
}
