import assert from 'node:assert/strict';
import { allocateWidths, defaultWidths, initialWorkspaceLayout, resizeWidths, workspaceLayoutSchema, type PaneWidths } from '../components/notes/workspaceLayout';
import type { Panel } from '../components/book/domain';

const visible: Panel[] = ['organizer', 'calendar', 'context'];
const minimum: PaneWidths = { inbox: 280, organizer: 260, calendar: 360, context: 360 };
const fixed = allocateWidths(visible, defaultWidths.browse, minimum, 1800, false);
assert.equal(fixed.organizer, 300, 'Stable navigation keeps its width');
assert.equal(fixed.calendar, 420);
assert.equal(fixed.context, 1080, 'The editor absorbs spare width');
const closed = allocateWidths(['organizer', 'calendar'], defaultWidths.browse, minimum, 1800, false);
assert.equal(closed.organizer, fixed.organizer, 'Closing context does not grow navigation');
assert.equal(closed.calendar, 1500);
for (const available of [320, 980, 1440, 3840]) {
  const widths = allocateWidths(visible, defaultWidths.browse, minimum, available, true);
  visible.forEach(key => assert.ok(widths[key] >= minimum[key] - 0.01));
  assert.ok(Math.abs(visible.reduce((sum, key) => sum + widths[key], 0) - Math.max(980, available)) < 0.01);
  const changed = resizeWidths(visible, widths, minimum, 'organizer', widths.organizer + 80, true);
  visible.forEach(key => assert.ok(changed[key] >= minimum[key] - 0.01));
  const again = allocateWidths(visible, changed, minimum, available, true);
  visible.forEach(key => assert.ok(Math.abs(again[key] - changed[key]) < 0.01, 'Resizing must not apply a second growth offset'));
  if (available > 980) visible.forEach(key => assert.notEqual(changed[key], widths[key], 'Auto mode updates every visible pane'));
}
const initial = initialWorkspaceLayout();
assert.ok(workspaceLayoutSchema.safeParse(initial).success);
assert.equal(workspaceLayoutSchema.safeParse({ ...initial, preset: 'unknown' }).success, false);
const updated = { ...initial, widths: { ...initial.widths, browse: fixed } };
assert.deepEqual(updated.widths.panels, defaultWidths.panels, 'Each preset retains independent widths');
assert.deepEqual(updated.widths.create, defaultWidths.create);
console.log('Workspace layout: stable sizing, spare space, narrow minima, all-pane rebalancing and independent presets passed.');
