'use client';
import { createContext, useContext } from 'react';
import type { BookItem } from './domain';
export type DailyItemActions = {
  details: (target: 'note' | 'folder' | 'planning') => void;
  close: () => void;
  openReflection: () => void;
  hasReflection: boolean;
  save?: () => void;
};
export const ItemActionsContext = createContext<((item: BookItem, anchor: HTMLButtonElement, daily?: DailyItemActions) => void) | null>(null);
export function ItemActionsButton({ item, disabled, daily }: { item: BookItem; disabled: boolean; daily?: DailyItemActions }) {
  const open = useContext(ItemActionsContext);
  return open ? <button type="button" className="an-item-actions" aria-label={daily ? 'Note actions' : `Actions for ${item.name}`} title="Item actions" aria-haspopup="dialog" disabled={disabled} onClick={event => open(item, event.currentTarget, daily)}>⋯</button> : null;
}
