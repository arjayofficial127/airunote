# Focused UX refinement — 2 November 2026

The user requested several minutes of actual use, an honest UI/UX/overall-experience rating, and implementation on main. This follows the completed compact Calendar release `3cb74b9`.

## Assessment

Hands-on baseline: 191 seconds using capture, note writing/preview, scheduling, moving, global search, collection discovery/Book reading, Plan/Calendar, and phone navigation against the isolated local QA workspace. Initial assessment: UI 8/10, usability 7.5/10, overall experience 8/10.

Observed friction: active global searches became invisible after dismissal; Schedule and Move opened the entire details editor; collection searches had a blank no-match state and creation was hidden behind ellipsis; Book page/reference maintenance competed with reading; long phone note titles dominated the available space.

Applied: visible query with direct clearing; focused Schedule/Move forms with presets, existing revision checks and draft protection; visible collection + and recovery/empty states; flat Book page navigation and maintenance menus; smaller note titles/spacing in narrow editor panes. Reference originals and data contracts are preserved.

After assessment: UI 9/10, usability 9/10, overall experience 9/10 for the tested flows. This is an expert review, not a measured user-study score. Ten out of ten remains an aspiration; a short self-test cannot certify universal usability or accessibility.

## Verification

- Production build, strict TypeScript, focused lint, and diff whitespace checks pass. Full build retains existing restricted-import warnings in unrelated files.
- Two coordinated implementation/smoke cycles; the second only removed a mobile Pages-label overlap found in screenshots.
- Schedule preset/save/cancel and All note details work. An unsaved schedule blocks closing the Note tab. Existing 09:30 survives Tomorrow; cancelling preserves the original date/time.
- A local test note saved 3 Nov 01:00 with 30-minute duration through native keyboard controls; its full path move to Personal preserved note content and schedule. Save/reload confirms all values.
- Writing, autosave, preview, and reload retain the local test note's added line. Native time and text controls were verified with keyboard entry because immediate automated fill/preview did not reliably represent real typing.
- Search shows its active query after the popover closes; Clear search resets it. Collection no-match text, clear recovery, and + menu work.
- Book page rename dialog/cancel, reference menu/Escape, inline reading, and selected-page reload pass. Remove/reorder actions remain available; no destructive collection operation was performed for this visual change.
- `responsive.json` records 13 settled layout checks across 320, 390, 768, 1440 and 3840px, Light/Charcoal and Cards/Panel coverage. Document width equals viewport throughout. Book/form content fits its own pane. Deliberate workspace/tab scrolling remains.
- Screenshots inspected: desktop Light Book, phone Charcoal Book, phone Light Panels Schedule. 4K DOM measurement succeeded; a full 3840×1600 screenshot timed out, so no 4K image is claimed.
- Unchanged Exams editor/visual preview opens; iPhone question state renders a selected answer and saved status, with iframe width/scrollWidth 394/394. No exam settings or attempts were changed.
- All test content mutations were in the local QA database. Production checks are read-only.

## Artifacts and scope

- `book-light.png`, `book-phone-dark.png`, `schedule-phone-light.png`, `mobile-question.png`, `responsive.json`.
- Build log: `/tmp/airunote-ux-refinement-build.log`.
- API contract/backend unchanged; no backend deployment is required.
- Unrelated existing edits to AGENTS.md/CLAUDE.md and older QA directories were preserved.

Deployment verification is recorded in the shared dated handoff after main is published.
