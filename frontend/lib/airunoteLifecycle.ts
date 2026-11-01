import { z } from 'zod';
import type { AiruFolder } from '@/components/airunote/types';
export const lifecycleState = z.enum(['active', 'archived', 'trashed']);
export type LifecycleState = z.infer<typeof lifecycleState>;
const metadata = z.object({ airunoteLifecycle: z.object({ state: lifecycleState }) });
export function folderState(folder: Pick<AiruFolder, 'metadata'>): LifecycleState { const parsed = metadata.safeParse(folder.metadata); return parsed.success ? parsed.data.airunoteLifecycle.state : 'active'; }
export function activeFolders(folders: AiruFolder[]): AiruFolder[] {
  const hidden = new Set(folders.filter(folder => folderState(folder) !== 'active').map(folder => folder.id));
  let changed = true;
  while (changed) { changed = false; for (const folder of folders) if (!hidden.has(folder.id) && hidden.has(folder.parentFolderId)) { hidden.add(folder.id); changed = true; } }
  return folders.filter(folder => !hidden.has(folder.id));
}
