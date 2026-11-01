# Spaces, Views and links

Local implementation authorized in the side conversation on 1 November 2026. Isolated branch `codex/spaces-views-links`, baseline `90b3d90`, because the main conversation is editing Inbox/navigation.

- Space is the user-facing name for a folder. A selected Space leads its view pane; Views are presentation choices. Keep existing IDs, stored preferences, multiple panes, frozen contexts and draft guards.
- Add link searches existing owned notes and Spaces. References keep the original home and content. Remove link only removes the reference. Links belong to a Space and appear in its views; per-view-only links and external URLs remain future refinements.
- Persist references in a namespaced Space metadata field through owner/org checked, transactional add/remove endpoints. Validate source, target, active ancestors and duplicates; avoid schema migration or replacing existing data.
- Preserve the existing metadata index and resolve references from it. Unavailable links remain removable. Do not recursively expand linked Spaces or change permissions.
- Verify targeted backend isolation/concurrency/persistence tests, frontend type/lint/build, local browser create/link/open/edit/unlink/reload/failure flows, view types, both themes at phone/tablet/desktop widths, and exam editor/preview/participant smoke. At most three coordinated cycles.
- Separate local preview/database; no production content changes or main-thread service interruption.
