import { z } from 'zod';
import type { Panel } from '@/components/book/domain';

export type WorkspacePreset = 'panels' | 'cards';
export type PaneWidths = Record<Panel, number>;
export const presetNames: Record<WorkspacePreset, string> = { panels: 'Panels', cards: 'Cards' };
export const defaultWidths: Record<WorkspacePreset, PaneWidths> = {
  panels: { inbox: 300, organizer: 360, calendar: 460, context: 520 },
  cards: { inbox: 300, organizer: 300, calendar: 420, context: 720 },
};
const widthsSchema = z.object({ inbox: z.number(), organizer: z.number(), calendar: z.number(), context: z.number() })
  .refine(value => Object.values(value).every(width => Number.isFinite(width) && width >= 180 && width <= 6000));
export const workspaceLayoutSchema = z.object({
  preset: z.enum(['panels', 'cards']),
  sizing: z.enum(['stable', 'auto']),
  navigation: z.enum(['folders', 'inbox']),
  folderChosen: z.boolean(),
  widths: z.object({ panels: widthsSchema, cards: widthsSchema }),
});
export type WorkspaceLayout = z.infer<typeof workspaceLayoutSchema>;
export function initialWorkspaceLayout(): WorkspaceLayout {
  return { preset: 'cards', sizing: 'stable', navigation: 'folders', folderChosen: false,
    widths: { panels: { ...defaultWidths.panels }, cards: { ...defaultWidths.cards } } };
}

const legacyLayoutSchema = workspaceLayoutSchema.extend({
  preset: z.enum(['panels', 'browse', 'create']),
  widths: z.object({ panels: widthsSchema, browse: widthsSchema, create: widthsSchema }),
});

/** Migrate the former presets once, preserving the selected arrangement and custom widths. */
export function migrateWorkspacePreferences(value: unknown): unknown {
  if (!value || typeof value !== 'object' || !('workspace' in value)) return value;
  const legacy = legacyLayoutSchema.safeParse(value.workspace);
  if (!legacy.success) return value;
  const old = legacy.data;
  const workspace: WorkspaceLayout = { ...old, preset: old.preset === 'panels' ? 'panels' : 'cards',
    widths: { panels: old.widths.panels, cards: old.preset === 'create' ? old.widths.create : old.widths.browse } };
  if (old.preset === 'panels') return { ...value, workspace };
  const context = 'visible' in value && Array.isArray(value.visible) && value.visible.includes('context');
  const writing = old.preset === 'create' && context && 'selectedId' in value && !!value.selectedId;
  return { ...value, workspace, visible: ['inbox', 'organizer', ...(!writing ? ['calendar'] : []), ...(context ? ['context'] : [])] };
}

/** Allocate only visible tracks; never make text smaller to fit a narrow screen. */
export function allocateWidths(visible: Panel[], preferred: PaneWidths, minimum: PaneWidths, available: number, auto: boolean): PaneWidths {
  const result = { ...preferred };
  if (!visible.length) return result;
  const floor = visible.reduce((sum, key) => sum + minimum[key], 0);
  const space = Math.max(floor, available);
  if (auto) {
    let remaining = space;
    let pending = [...visible];
    while (pending.length) {
      const weight = pending.reduce((sum, key) => sum + preferred[key], 0);
      const constrained = pending.filter(key => remaining * preferred[key] / weight < minimum[key]);
      if (!constrained.length) {
        pending.forEach(key => { result[key] = remaining * preferred[key] / weight; });
        break;
      }
      constrained.forEach(key => { result[key] = minimum[key]; remaining -= minimum[key]; });
      pending = pending.filter(key => !constrained.includes(key));
    }
  } else {
    visible.forEach(key => { result[key] = Math.max(minimum[key], preferred[key]); });
  }
  return result;
}

/** In auto mode a drag reallocates all other visible tracks, with minima intact. */
export function resizeWidths(visible: Panel[], current: PaneWidths, minimum: PaneWidths, key: Panel, desired: number, auto: boolean): PaneWidths {
  const result = { ...current };
  const peers = visible.filter(panel => panel !== key);
  if (auto && !peers.length) return result;
  const total = visible.reduce((sum, panel) => sum + current[panel], 0);
  const max = auto ? total - peers.reduce((sum, panel) => sum + minimum[panel], 0) : 6000;
  result[key] = Math.max(minimum[key], Math.min(max, desired));
  if (auto) {
    const remaining = total - result[key] - peers.reduce((sum, panel) => sum + minimum[panel], 0);
    const weights = peers.reduce((sum, panel) => sum + Math.max(1, current[panel] - minimum[panel]), 0);
    peers.forEach(panel => { result[panel] = minimum[panel] + remaining * Math.max(1, current[panel] - minimum[panel]) / weights; });
  }
  return result;
}
