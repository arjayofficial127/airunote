import assert from 'node:assert/strict';
import { allocateWidths, defaultWidths, initialWorkspaceLayout, migrateWorkspacePreferences, resizeWidths, workspaceLayoutSchema, type PaneWidths } from '../components/notes/workspaceLayout';
import type { Panel } from '../components/book/domain';

const visible: Panel[] = ['organizer', 'calendar', 'context'];
const minimum: PaneWidths = { inbox: 280, organizer: 260, calendar: 360, context: 360 };
for (const available of [320, 980, 1800, 3840]) {
  for (const shown of [visible, ['inbox', 'organizer'] as Panel[], ['context'] as Panel[]]) {
    const fixed = allocateWidths(shown, defaultWidths.cards, minimum, available, false);
    shown.forEach(key => assert.equal(fixed[key], defaultWidths.cards[key], 'Stable widths do not fit spare space or change when peers close'));
  }
  const widths = allocateWidths(visible, defaultWidths.cards, minimum, available, true);
  visible.forEach(key => assert.ok(widths[key] >= minimum[key] - 0.01));
  assert.ok(Math.abs(visible.reduce((sum, key) => sum + widths[key], 0) - Math.max(980, available)) < 0.01);
  const changed = resizeWidths(visible, widths, minimum, 'organizer', widths.organizer + 80, true);
  visible.forEach(key => assert.ok(changed[key] >= minimum[key] - 0.01));
  const again = allocateWidths(visible, changed, minimum, available, true);
  visible.forEach(key => assert.ok(Math.abs(again[key] - changed[key]) < 0.01, 'No second resize offset'));
  if (available > 980) visible.forEach(key => assert.notEqual(changed[key], widths[key], 'Auto mode updates every visible pane'));
}
const resized = resizeWidths(visible, defaultWidths.cards, minimum, 'context', 800, false);
assert.equal(resized.context, 800);
assert.equal(resized.calendar, defaultWidths.cards.calendar, 'Stable resizing never steals a peer width');
assert.equal(resizeWidths(['context'], defaultWidths.cards, minimum, 'context', 900, false).context, 900, 'One locked pane can still resize');
const initial = initialWorkspaceLayout();
assert.ok(workspaceLayoutSchema.safeParse(initial).success);
assert.equal(workspaceLayoutSchema.safeParse({ ...initial, preset: 'unknown' }).success, false);
const legacyWidths = { panels: defaultWidths.panels, browse: { ...defaultWidths.cards, organizer: 410 }, create: { ...defaultWidths.cards, context: 930 } };
for (const preset of ['browse', 'create', 'panels'] as const) {
  const raw = { workspace: { ...initial, preset, widths: legacyWidths }, visible: ['inbox', 'organizer', 'calendar', 'context'], selectedId: 'note-id', unrelated: 'preserve' };
  const expected = { ...raw, workspace: { ...initial, preset: preset === 'panels' ? 'panels' : 'cards', widths: { panels: legacyWidths.panels, cards: preset === 'create' ? legacyWidths.create : legacyWidths.browse } }, visible: preset === 'create' ? ['inbox', 'organizer', 'context'] : raw.visible };
  assert.deepEqual(migrateWorkspacePreferences(raw), expected, 'Migrate custom widths and actual visible arrangement');
  assert.deepEqual(migrateWorkspacePreferences(expected), expected, 'Migration is idempotent');
}
assert.deepEqual(migrateWorkspacePreferences({ workspace: initial, visible: [] }), { workspace: initial, visible: [] }, 'Keep all-hidden preferences');
assert.deepEqual(migrateWorkspacePreferences(null), null);
console.log('Workspace sizing and legacy preference migration passed.');
