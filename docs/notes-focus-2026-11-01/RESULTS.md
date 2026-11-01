# Focused Notes workspace — verified 1 November 2026

The user authorized implementation and release to main. Browse and Create now share a small **Folders | Inbox** navigator and contextual **Note | Folder** workspace. Panels retains the existing multiple Folders and Frozen/Following Lenses layouts. Light and Charcoal remain independent appearance choices.

## Behavior

- Browse opens a folder's view in the middle and a selected note on the right. Before a folder is selected, the middle shows a choose-folder state.
- Create gives the note the main working area. Show view restores the middle pane without leaving the editor.
- Folder details provides name editing through the existing update API, a browser-local default view, folder information, and existing Archive/Trash actions.
- Context tabs follow selection, can close independently, and protect unsaved changes. Switching navigator tabs or workspace layouts keeps mounted drafts.
- Pointer and keyboard resizing are available on the main panes. Keep my widths preserves navigation width and assigns spare space to the work area. Auto fit shares space across visible panes and rebalances all of them when resized.
- Each preset remembers its widths. Focused phone panes fit the available viewport without replacing desktop width preferences. Pane shortcuts provide access to the horizontally arranged workspace.

## Validation

- Frontend production build, TypeScript, focused Notes lint, and whitespace checks passed.
- Layout allocation and existing pane-state assertion suites passed. Four agenda tests passed. The existing agenda fixture now includes its required `closed` field, resolving the prior standalone TypeScript failure.
- Five exam regression tests passed against the isolated local environment.
- 70 distinct Notes browser checkpoints are recorded in `smoke-results.json`, with no JavaScript page errors. They include real capture/save/reload, new-note draft preservation, failed note and folder saves, close guards, folder rename/default-view changes, contextual tabs, pointer/keyboard resizing, and multiple/frozen pane retention.
- All three presets were checked in both themes at 3840, 1440, 1024 and 390 CSS pixels. Document overflow stayed contained. Final focused-pane checks also cover 320 and 600 pixels; phone screenshots and restored desktop widths were inspected.
- Exam author editor and published preview opened successfully. A local participant answered the two sample questions on a 390-pixel phone viewport, submitted, and retained the submitted state after reload. Question, date, confirmation and completion screenshots are included.

Final local build used the local API at `localhost:4321`; the review frontend ran at `localhost:4320`. Production deployment status is recorded separately in the shared release handoff.

## Evidence and limits

- `browse-light-final.png`, `create-dark.png`: final desktop layouts.
- `browse-mobile-*.png`, `create-mobile-*.png`, `inbox-mobile-dark.png`: focused phone editor and anchored Inbox composer.
- `exam-*.png`: isolated author/preview/participant checks.
- No backend or database schema change is required. No production records were modified.
- Existing build warnings outside Notes and missing local upload-service credentials remain; upload behavior was outside this change.
- A repeated local QA note title encountered the existing database uniqueness error; using a unique title completed creation. Duplicate-title error wording is outside this frontend workspace change.
- Existing unrelated instruction-file edits and older QA directories were preserved and excluded from the commit.

Commands: `pnpm --filter frontend build`, `pnpm --filter frontend exec tsc --noEmit`, `pnpm --filter frontend exec next lint --dir components/notes`, and backend `tsx` runners for `frontend/scripts/notes-layout.test.ts`, `notes-panes.test.ts`, `notes-agenda.test.ts`, and the existing exam access-code/entry-fields/unlimited-attempts regressions. Browser scripts and authentication state were temporary local QA files, not committed credentials.
