import { z } from 'zod';
import type { Panel } from '@/components/book/domain';

export type WorkspacePreset = 'panels' | 'browse' | 'create';
export type PaneWidths = Record<Panel, number>;
export const presetNames: Record<WorkspacePreset, string> = { panels: 'Panels', browse: 'Browse', create: 'Create' };
export const defaultWidths: Record<WorkspacePreset, PaneWidths> = {
  panels: { inbox: 300, organizer: 360, calendar: 460, context: 520 },
  browse: { inbox: 300, organizer: 300, calendar: 420, context: 540 },
  create: { inbox: 300, organizer: 280, calendar: 420, context: 720 },
};
const widthsSchema = z.object({ inbox: z.number(), organizer: z.number(), calendar: z.number(), context: z.number() })
  .refine(value => Object.values(value).every(width => Number.isFinite(width) && width >= 180 && width <= 6000));
export const workspaceLayoutSchema = z.object({
  preset: z.enum(['panels', 'browse', 'create']),
  sizing: z.enum(['stable', 'auto']),
  navigation: z.enum(['folders', 'inbox']),
  folderChosen: z.boolean(),
  widths: z.object({ panels: widthsSchema, browse: widthsSchema, create: widthsSchema }),
});
export type WorkspaceLayout = z.infer<typeof workspaceLayoutSchema>;
export function initialWorkspaceLayout(): WorkspaceLayout {
  return { preset: 'browse', sizing: 'stable', navigation: 'folders', folderChosen: false,
    widths: { panels: { ...defaultWidths.panels }, browse: { ...defaultWidths.browse }, create: { ...defaultWidths.create } } };
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
    const total = visible.reduce((sum, key) => sum + result[key], 0);
    const flexible = visible.includes('context') ? 'context' : visible.includes('calendar') ? 'calendar' : visible[visible.length - 1];
    if (flexible) result[flexible] += Math.max(0, space - total);
  }
  return result;
}

/** In auto mode a drag reallocates all other visible tracks, with minima intact. */
export function resizeWidths(visible: Panel[], current: PaneWidths, minimum: PaneWidths, key: Panel, desired: number, auto: boolean): PaneWidths {
  const result = { ...current };
  const peers = visible.filter(panel => panel !== key);
  if (!peers.length) return result;
  const total = visible.reduce((sum, panel) => sum + current[panel], 0);
  const max = auto ? total - peers.reduce((sum, panel) => sum + minimum[panel], 0) : 6000;
  result[key] = Math.max(minimum[key], Math.min(max, desired));
  if (auto) {
    const remaining = total - result[key] - peers.reduce((sum, panel) => sum + minimum[panel], 0);
    const weights = peers.reduce((sum, panel) => sum + Math.max(1, current[panel] - minimum[panel]), 0);
    peers.forEach(panel => { result[panel] = minimum[panel] + remaining * Math.max(1, current[panel] - minimum[panel]) / weights; });
  } else if (key === 'context' || (key === 'calendar' && !visible.includes('context'))) {
    const donor = peers[peers.length - 1];
    if (donor) result[donor] = Math.max(minimum[donor], current[donor] - (result[key] - current[key]));
  }
  return result;
}
