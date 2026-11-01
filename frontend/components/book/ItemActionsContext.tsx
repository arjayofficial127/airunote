'use client';
import { createContext, useContext } from 'react';
import type { BookItem } from './domain';
export const ItemActionsContext = createContext<((item: BookItem) => void) | null>(null);
export function ItemActionsButton({ item, disabled }: { item: BookItem; disabled: boolean }) {
  const open = useContext(ItemActionsContext);
  return open ? <button type="button" className="an-item-actions" aria-label={`Actions for ${item.name}`} title="Archive or delete" disabled={disabled} onClick={() => open(item)}>⋯</button> : null;
}
