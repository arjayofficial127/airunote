# Panels / Cards batch

User authorized the accumulated batch and main release, adding a stable-width defect visible in Panels.

- Consolidate Browse/Create into Cards with a tabbed Folders | Inbox navigator. Keep Panels adjoining columns. Both retain visibility controls, multiple folders/frozen lenses, group layouts, and shared data/drafts.
- Make Keep my widths strictly preserve requested widths when panes open/close or the viewport grows. Auto fit alone distributes spare space. Temporary explicit expansion and phone fitting must not overwrite saved widths.
- Use one visible-pane state for navigation/Lenses/context; note/folder navigation must not silently toggle Lenses. Migrate old preset widths and visibility without losing other preferences.
- Expose existing Archive/Delete actions on unprocessed Inbox items; separate review controls from the action menu.
- Explicitly closing the last pinned context tab closes it. Save/restore folder context and selected context tab, validating current ownership.
- Build/typecheck/focused lint plus meaningful sizing/migration tests. Local browser checks cover actual Inbox trash/restore and failure retention, draft/tab continuity, width locking, all-hidden recovery, expansion, multiple/frozen panes, themes/phone/4K, and exam editor/preview/phone questions/submission. Maximum three complete implementation/smoke cycles.

User added during implementation: dismiss Layout/Panels/ellipsis popovers on outside click and Escape; move Archive / Trash into the top ellipsis menu; selecting any folder opens its Folder context automatically. Protect unsaved note/folder changes before switching context.
