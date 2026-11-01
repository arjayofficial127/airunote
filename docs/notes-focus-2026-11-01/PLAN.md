# Notes workspace presets and tabbed navigation

User authorized implementation and main push on 1 November 2026, following the Browse/Create concepts and the explicit Folders | Inbox clarification.

- Keep Panels as the existing independent Folders/Lenses power layout.
- Add Browse and Create with one tabbed Folders | Inbox navigator. Preserve both mounted states and keep the Inbox composer below its list.
- Use a shared Note/Folder context workspace, two closable contextual tabs, existing name-save path, default-view selection and folder information.
- Browse starts with a choose-folder state; folder selection opens its view, note selection opens the editor. Create hides the view while editing, with explicit recovery.
- Persist validated template, sizing mode, navigation tab and widths per template in the existing browser preferences.
- Stable widths preserve navigation and give spare space to the main work area. Auto fit rebalances visible panes and honors minimum widths. Keyboard/pointer resizing is available on each main pane.
- Preserve drafts, the original multi-pane contexts, Frozen/Following lenses, lifecycle operations and exam behavior. No backend/schema changes or production record writes.

Checks: focused layout/state tests, frontend lint/types/build; local browser capture/save/reload, folder name save/failure/draft guard, pane/tab changes, resizing, existing multiple/frozen panes, light/dark 4K/desktop/tablet/phone overflow/screenshots, and exam editor/preview/participant smoke. At most three complete implementation/smoke cycles.
